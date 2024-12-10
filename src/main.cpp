#include <iostream>
#include <string>
#include <fstream>
#include <pqxx/pqxx>
#include <restbed>
#include <nlohmann/json.hpp>
#include <random>
#include <sstream>
#include <chrono>
#include <openssl/rand.h>
#include <unordered_map>
#include <shared_mutex>
#include <queue>
#include <condition_variable>
#include <mutex>
#include <thread>
#include <iomanip>
#include <algorithm>

using namespace std;
using json = nlohmann::json;
using Resource = restbed::Resource;
using Session = restbed::Session;

// Структура для кэширования данных
struct CacheEntry {
    json data;
    std::chrono::system_clock::time_point timestamp;
};

// Кэш с использованием shared_mutex
class Cache {
public:
    Cache(std::chrono::seconds duration) : cache_duration(duration) {}

    json get(const std::string& key, std::function<json()> fetch_func) {
        std::shared_lock<std::shared_mutex> lock(cache_mutex);
        auto now = std::chrono::system_clock::now();
        auto it = cache.find(key);
        if (it != cache.end() && now - it->second.timestamp < cache_duration) {
            return it->second.data;
        }
        lock.unlock(); // Освобождаем shared_lock перед эксклюзивной записью

        std::unique_lock<std::shared_mutex> unique_lock(cache_mutex);
        // Проверяем снова, чтобы избежать гонки
        it = cache.find(key);
        if (it != cache.end() && now - it->second.timestamp < cache_duration) {
            return it->second.data;
        }
        json data = fetch_func();
        cache[key] = { data, now };
        return data;
    }

    void invalidate(const std::string& key) {
        std::unique_lock<std::shared_mutex> lock(cache_mutex);
        cache.erase(key);
    }

private:
    std::unordered_map<std::string, CacheEntry> cache;
    std::shared_mutex cache_mutex;
    std::chrono::seconds cache_duration;
};

// Пул соединений с базой данных
class ConnectionPool {
public:
    ConnectionPool(const string& connection_str, size_t pool_size) {
        for (size_t i = 0; i < pool_size; ++i) {
            connections.emplace(make_shared<pqxx::connection>(connection_str));
        }
    }

    shared_ptr<pqxx::connection> acquire() {
        unique_lock<mutex> lock(mtx);
        cv.wait(lock, [this]() { return !connections.empty(); });
        auto conn = connections.front();
        connections.pop();
        return conn;
    }

    void release(shared_ptr<pqxx::connection> conn) {
        unique_lock<mutex> lock(mtx);
        connections.push(conn);
        lock.unlock();
        cv.notify_one();
    }

private:
    queue<shared_ptr<pqxx::connection>> connections;
    mutex mtx;
    condition_variable cv;
};

// Инициализация глобального кэша и пула соединений
Cache cache(std::chrono::seconds(600));
const string connection_str = "user=postgres port=5432 dbname=test password=1060 host=localhost";
const size_t pool_size = 10;
ConnectionPool connection_pool(connection_str, pool_size);

// Генерация безопасного session_id
std::string generate_session_id() {
    unsigned char buffer[16]; // 128 бит
    if (RAND_bytes(buffer, sizeof(buffer)) != 1) {
        throw std::runtime_error("Не удалось сгенерировать безопасный session ID");
    }
    stringstream ss;
    for (size_t i = 0; i < sizeof(buffer); ++i) {
        ss << std::hex << setw(2) << setfill('0') << static_cast<int>(buffer[i]);
    }
    return ss.str();
}

// Удаление старых сессий из базы данных
void delete_old_cookies() {
    try {
        auto conn = connection_pool.acquire();
        pqxx::work txn(*conn);
        txn.exec("DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '12 hours';");
        txn.commit();
        connection_pool.release(conn);
    }
    catch (const std::exception& e) {
        std::cerr << "Ошибка при удалении cookies: " << e.what() << std::endl;
    }
}

// Функция для периодического удаления старых сессий
void schedule_cookie_deletion() {
    while (true) {
        delete_old_cookies();
        std::this_thread::sleep_for(std::chrono::hours(1));
    }
}

// Проверка валидности сессии
bool is_session_valid(const string& session_id, string& email) {
    try {
        auto conn = connection_pool.acquire();
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec_params("SELECT email FROM sessions WHERE session_id = $1", session_id);
        txn.commit();
        connection_pool.release(conn);
        if (!r.empty()) {
            email = r[0]["email"].c_str();
            return true;
        }
    }
    catch (const std::exception& e) {
        std::cerr << "Ошибка при валидации сессии: " << e.what() << std::endl;
    }
    return false;
}

// Загрузка файла из диска
string load_file(const string& filename) {
    ifstream file(filename, ios::in | ios::binary);
    if (!file) {
        throw runtime_error("Не удалось открыть файл " + filename);
    }
    return string((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
}

// Извлечение session_id из заголовков запроса
string extract_session_id(const shared_ptr<Session>& session) {
    const auto request = session->get_request();
    string session_cookie = request->get_header("Cookie", "");
    string session_id;
    size_t pos = session_cookie.find("session_id=");
    if (pos != string::npos) {
        session_id = session_cookie.substr(pos + 11);
        size_t end = session_id.find(';');
        if (end != string::npos) {
            session_id = session_id.substr(0, end);
        }
    }
    return session_id;
}

// Обработчик главной страницы (регистрация)
void get_index_handler(const shared_ptr<Session> session) {
    try {
        const string response = load_file("D:/CRM/src/web/Registration.html");
        session->close(restbed::OK, response, { {"Content-Length", to_string(response.size())}, {"Content-Type", "text/html; charset=utf-8"} });
    }
    catch (const exception& e) {
        cerr << "Ошибка загрузки HTML файла: " << e.what() << endl;
        string error_message = "Ошибка загрузки HTML файла";
        session->close(restbed::INTERNAL_SERVER_ERROR, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/html; charset=utf-8"} });
    }
}

// Обработчик успешного входа (главная страница после логина)
void get_success_handler(const shared_ptr<Session> session) {
    string session_id = extract_session_id(session);
    if (!session_id.empty()) {
        string email;
        if (is_session_valid(session_id, email)) {
            try {
                const string response = load_file("D:/CRM/src/web/PageMain.html");
                session->close(restbed::OK, response, { {"Content-Length", to_string(response.size())}, {"Content-Type", "text/html; charset=utf-8"} });
                return;
            }
            catch (const exception& e) {
                cerr << "Ошибка загрузки HTML файла: " << e.what() << endl;
                string error_message = "Ошибка загрузки HTML файла";
                session->close(restbed::INTERNAL_SERVER_ERROR, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/html; charset=utf-8"} });
                return;
            }
        }
    }
    // Если сессия не валидна, перенаправляем на страницу логина
    restbed::Response response;
    response.set_status_code(restbed::SEE_OTHER);
    response.set_header("Location", "/");
    session->close(response);
}

// Обработчик других страниц с проверкой сессии
bool serve_protected_page(const shared_ptr<Session>& session, const string& filepath) {
    string session_id = extract_session_id(session);
    if (!session_id.empty()) {
        string email;
        if (is_session_valid(session_id, email)) {
            try {
                const string response = load_file(filepath);
                session->close(restbed::OK, response, { {"Content-Length", to_string(response.size())}, {"Content-Type", "text/html; charset=utf-8"} });
                return true;
            }
            catch (const exception& e) {
                cerr << "Ошибка загрузки HTML файла: " << e.what() << endl;
                string error_message = "Ошибка загрузки HTML файла";
                session->close(restbed::INTERNAL_SERVER_ERROR, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/html; charset=utf-8"} });
                return false;
            }
        }
    }
    // Если сессия не валидна, перенаправляем на страницу логина
    restbed::Response response;
    response.set_status_code(restbed::SEE_OTHER);
    response.set_header("Location", "/");
    session->close(response);
    return false;
}

// Обработчик таблицы
void get_table_handler(const shared_ptr<Session> session) {
    serve_protected_page(session, "D:/CRM/src/web/Table.html");
}

// Обработчик CSS
void css_handler(const shared_ptr<Session> session) {
    try {
        const string response = load_file("D:/CRM/src/web/custom.css");
        session->close(restbed::OK, response, { {"Content-Length", to_string(response.size())}, {"Content-Type", "text/css"} });
    }
    catch (const exception& e) {
        cerr << "Ошибка загрузки CSS файла: " << e.what() << endl;
        string error_message = "Ошибка загрузки CSS файла";
        session->close(restbed::INTERNAL_SERVER_ERROR, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/css"} });
    }
}

// Обработчики API (tools, products, services) с кэшированием
template <typename T>
void get_list_handler(const shared_ptr<Session>& session, const string& cache_key, const string& query, const string& type) {
    string session_id = extract_session_id(session);
    if (!session_id.empty()) {
        string email;
        if (is_session_valid(session_id, email)) {
            try {
                json data = cache.get(cache_key, [&]() {
                    auto conn = connection_pool.acquire();
                    pqxx::work txn(*conn);
                    pqxx::result r = txn.exec(query);
                    txn.commit();
                    connection_pool.release(conn);

                    json list = json::array();
                    for (const auto& row : r) {
                        json item;
                        for (const auto& field : row) {
                            item[field.name()] = field.as<string>();
                        }
                        list.push_back(item);
                    }
                    return list;
                    });

                string response_body = data.dump();
                session->close(restbed::OK, response_body, { {"Content-Type", "application/json"}, {"Content-Length", to_string(response_body.size())} });
                return;
            }
            catch (const std::exception& e) {
                std::cerr << "Ошибка при получении " << type << ": " << e.what() << std::endl;
                string error_message = "Ошибка при получении " + type;
                session->close(restbed::INTERNAL_SERVER_ERROR, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                return;
            }
        }
    }
    // Если сессия не валидна
    string error_message = "Unauthorized";
    session->close(restbed::UNAUTHORIZED, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
}

// Специализация для обработчиков tools, products, services
void get_tools_handler(const shared_ptr<Session> session) {
    get_list_handler<json>(session, "tools", "SELECT id, name, amount, price FROM tools", "tools");
}

void get_products_handler(const shared_ptr<Session> session) {
    get_list_handler<json>(session, "products", "SELECT id, name, amount, price FROM products", "products");
}

void get_services_handler(const shared_ptr<Session> session) {
    get_list_handler<json>(session, "services", "SELECT id, name, contractor, price FROM contractors_services", "services");
}

// Обработчик сделок с добавлением clientName и duration с проверкой на NULL
void get_deals_handler(const shared_ptr<Session> session) {
    string session_id = extract_session_id(session);
    if (!session_id.empty()) {
        string email;
        if (is_session_valid(session_id, email)) {
            const auto request = session->get_request();
            string start_date = request->get_query_parameter("start_date", "");
            string end_date = request->get_query_parameter("end_date", "");

            if (start_date.empty() || end_date.empty()) {
                string message = "Отсутствуют параметры start_date или end_date";
                session->close(restbed::BAD_REQUEST, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                return;
            }

            try {
                string deals_cache_key = "deals";
                json deals = cache.get(deals_cache_key, [&]() {
                    auto conn = connection_pool.acquire();
                    pqxx::work txn(*conn);
                    // Обновленный SQL-запрос с полем duration
                    string query = "SELECT d.scheduled_date, c.name AS clientName, d.duration FROM deals d "
                        "JOIN clients_info c ON d.client_id = c.id "
                        "WHERE d.scheduled_date BETWEEN $1 AND $2";
                    pqxx::result r = txn.exec_params(query, start_date, end_date);
                    txn.commit();
                    connection_pool.release(conn);

                    json deal_list = json::array();
                    for (const auto& row : r) {
                        json deal;
                        deal["scheduled_date"] = row["scheduled_date"].c_str();
                        deal["clientName"] = row["clientName"].c_str();
                        // Проверка на NULL значение для duration
                        if (row["duration"].is_null()) {
                            deal["duration"] = 0; // Установите значение по умолчанию
                        }
                        else {
                            deal["duration"] = row["duration"].as<int>();
                        }
                        deal_list.push_back(deal);
                    }
                    return deal_list;
                    });

                string response_body = deals.dump();
                session->close(restbed::OK, response_body, { {"Content-Type", "application/json"}, {"Content-Length", to_string(response_body.size())} });
                return;
            }
            catch (const std::exception& e) {
                std::cerr << "Ошибка при получении сделок: " << e.what() << std::endl;
                string error_message = "Ошибка при получении сделок";
                session->close(restbed::INTERNAL_SERVER_ERROR, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                return;
            }
        }
    }
    // Если сессия не валидна
    string error_message = "Unauthorized";
    session->close(restbed::UNAUTHORIZED, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
}

// Обработчик регистрации
void post_method_registration(const shared_ptr<Session> session) {
    const auto request = session->get_request();
    int content_length = request->get_header("Content-Length", 0);
    session->fetch(content_length, [&](const shared_ptr<Session> session, const restbed::Bytes& body) {
        try {
            auto request_body = string(reinterpret_cast<const char*>(body.data()), body.size());
            auto data = json::parse(request_body);

            // Проверка наличия необходимых полей
            if (!data.contains("email") || !data.contains("password") || !data.contains("checkPassword")) {
                string message = "Отсутствуют email, password или checkPassword";
                session->close(restbed::BAD_REQUEST, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                return;
            }

            string email = data["email"];
            string password = data["password"];
            string check_password = data["checkPassword"];

            if (password != check_password) {
                string message = "Пароли не совпадают";
                session->close(restbed::BAD_REQUEST, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                return;
            }

            auto conn = connection_pool.acquire();
            pqxx::work txn(*conn);

            // Проверка на существование пользователя
            pqxx::result existing = txn.exec_params("SELECT id FROM users_data WHERE email = $1", email);
            if (!existing.empty()) {
                string message = "Пользователь с таким email уже существует";
                session->close(restbed::CONFLICT, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                connection_pool.release(conn);
                return;
            }

            // Вставка нового пользователя
            txn.exec_params("INSERT INTO users_data (email, password) VALUES ($1, crypt($2, gen_salt('bf')))", email, password);
            txn.commit();
            connection_pool.release(conn);

            // Перенаправление на страницу логина
            restbed::Response response;
            response.set_status_code(restbed::SEE_OTHER);
            response.set_header("Location", "/");
            session->close(response);
        }
        catch (const json::exception& e) {
            cerr << "Ошибка парсинга JSON: " << e.what() << endl;
            string message = "Неверный формат JSON";
            session->close(restbed::BAD_REQUEST, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
        }
        catch (const pqxx::sql_error& e) {
            cerr << "SQL ошибка: " << e.what() << endl;
            string message = "Ошибка базы данных";
            session->close(restbed::INTERNAL_SERVER_ERROR, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
        }
        catch (const exception& e) {
            cerr << "Ошибка: " << e.what() << endl;
            string message = "Серверная ошибка";
            session->close(restbed::INTERNAL_SERVER_ERROR, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
        }
        });
}

// Обработчик входа в систему
void post_method_login(const shared_ptr<Session> session) {
    const auto request = session->get_request();
    int content_length = request->get_header("Content-Length", 0);
    session->fetch(content_length, [&](const shared_ptr<Session> session, const restbed::Bytes& body) {
        try {
            auto request_body = string(reinterpret_cast<const char*>(body.data()), body.size());
            auto data = json::parse(request_body);

            // Проверка наличия необходимых полей
            if (!data.contains("email") || !data.contains("password")) {
                string message = "Отсутствуют email или password";
                session->close(restbed::BAD_REQUEST, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                return;
            }

            string email = data["email"];
            string password = data["password"];

            auto conn = connection_pool.acquire();
            pqxx::work txn(*conn);

            // Проверка пароля
            pqxx::result r = txn.exec_params("SELECT (password = crypt($1, password)) AS password_match FROM users_data WHERE email = $2;", password, email);
            txn.commit();
            connection_pool.release(conn);

            if (r.empty()) {
                // Email не найден
                string message = "Неверный email или пароль";
                session->close(restbed::UNAUTHORIZED, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                return;
            }
            else {
                bool match = r[0]["password_match"].as<bool>();
                if (match) {
                    // Генерация нового session_id
                    string session_id = generate_session_id();

                    auto conn2 = connection_pool.acquire();
                    pqxx::work txn2(*conn2);
                    txn2.exec_params("INSERT INTO sessions (session_id, email, created_at) VALUES ($1, $2, NOW())", session_id, email);
                    txn2.commit();
                    connection_pool.release(conn2);

                    // Установка cookie и перенаправление
                    restbed::Response response;
                    response.set_status_code(restbed::SEE_OTHER);
                    response.set_header("Location", "/PageMain");
                    response.set_header("Set-Cookie", "session_id=" + session_id + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600");
                    session->close(response);
                }
                else {
                    // Неверный пароль
                    string message = "Неверный email или пароль";
                    session->close(restbed::UNAUTHORIZED, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                }
            }
        }
        catch (const json::exception& e) {
            cerr << "Ошибка парсинга JSON: " << e.what() << endl;
            string message = "Неверный формат JSON";
            session->close(restbed::BAD_REQUEST, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
        }
        catch (const pqxx::sql_error& e) {
            cerr << "SQL ошибка: " << e.what() << endl;
            string message = "Ошибка базы данных";
            session->close(restbed::INTERNAL_SERVER_ERROR, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
        }
        catch (const exception& e) {
            cerr << "Ошибка: " << e.what() << endl;
            string message = "Серверная ошибка";
            session->close(restbed::INTERNAL_SERVER_ERROR, message, { {"Content-Length", to_string(message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
        }
        });
}

// Обработчик создания сделки
void post_create_deal_handler(const shared_ptr<Session> session) {
    int content_length = session->get_request()->get_header("Content-Length", 0);
    string session_id = extract_session_id(session);

    if (!session_id.empty()) {
        string email;
        if (is_session_valid(session_id, email)) {
            session->fetch(content_length, [email](const shared_ptr<Session> session, const restbed::Bytes& body) {
                try {
                    auto request_body = string(reinterpret_cast<const char*>(body.data()), body.size());
                    auto data = json::parse(request_body);

                    // Проверка данных клиента
                    if (!data.contains("clientName") || (!data.contains("clientPhone") && !data.contains("clientEmail"))) {
                        throw std::runtime_error("Необходимые данные о клиенте отсутствуют");
                    }

                    string clientName = data["clientName"];
                    string clientPhone = data.value("clientPhone", "");
                    string clientEmail = data.value("clientEmail", "");

                    if (clientName.empty() || (clientPhone.empty() && clientEmail.empty())) {
                        throw std::runtime_error("Необходимо указать контактные данные клиента");
                    }

                    vector<json> tools = data.value("tools", vector<json>());
                    vector<json> products = data.value("products", vector<json>());
                    vector<json> services = data.value("services", vector<json>());
                    string dateTime = data["dateTime"];
                    int duration = data.value("duration", 0);

                    double total_cost = 0.0;

                    auto conn = connection_pool.acquire();
                    pqxx::work txn(*conn);

                    // Получение или создание клиента
                    int client_id;
                    pqxx::result client_res = txn.exec_params("SELECT id FROM clients_info WHERE email = $1", clientEmail);
                    if (!client_res.empty()) {
                        client_id = client_res[0]["id"].as<int>();
                    }
                    else {
                        pqxx::result new_client_res = txn.exec_params(
                            "INSERT INTO clients_info (name, phone_number, email) VALUES ($1, $2, $3) RETURNING id",
                            clientName, clientPhone, clientEmail);
                        client_id = new_client_res[0]["id"].as<int>();
                    }

                    // Обработка инструментов
                    for (const auto& tool : tools) {
                        int tool_id = tool["id"];
                        int amount = tool["amount"];
                        int duration = tool["duration"];

                        pqxx::result tool_res = txn.exec_params("SELECT amount, price FROM tools WHERE id = $1", tool_id);
                        if (tool_res.empty()) {
                            throw std::runtime_error("Инструмент с ID " + to_string(tool_id) + " не существует");
                        }

                        int available = tool_res[0]["amount"].as<int>();
                        double price = tool_res[0]["price"].as<double>();

                        if (available < amount) {
                            throw std::runtime_error("Недостаточное количество инструмента с ID " + to_string(tool_id));
                        }

                        txn.exec_params("UPDATE tools SET amount = amount - $1 WHERE id = $2", amount, tool_id);
                        total_cost += price * amount * duration / 60;
                    }

                    // Обработка продуктов
                    for (const auto& product : products) {
                        int product_id = product["id"];
                        int amount = product["amount"];

                        pqxx::result product_res = txn.exec_params("SELECT amount, price FROM products WHERE id = $1", product_id);
                        if (product_res.empty()) {
                            throw std::runtime_error("Продукт с ID " + to_string(product_id) + " не существует");
                        }

                        int available = product_res[0]["amount"].as<int>();
                        double price = product_res[0]["price"].as<double>();

                        if (available < amount) {
                            throw std::runtime_error("Недостаточное количество продукта с ID " + to_string(product_id));
                        }

                        txn.exec_params("UPDATE products SET amount = amount - $1 WHERE id = $2", amount, product_id);
                        total_cost += price * amount;
                    }

                    // Обработка услуг
                    for (const auto& service : services) {
                        int service_id = service["id"];

                        pqxx::result service_res = txn.exec_params("SELECT price FROM contractors_services WHERE id = $1", service_id);
                        if (service_res.empty()) {
                            throw std::runtime_error("Услуга с ID " + to_string(service_id) + " не существует");
                        }

                        double price = service_res[0]["price"].as<double>();
                        total_cost += price;
                    }

                    // Вставка ресурса
                    stringstream ss;
                    ss << "Resource_" << chrono::system_clock::now().time_since_epoch().count();
                    string resource_name = ss.str();

                    pqxx::result resource_res = txn.exec_params("INSERT INTO resources (name, price) VALUES ($1, $2) RETURNING id", resource_name, total_cost);
                    int resource_id = resource_res[0]["id"].as<int>();

                    // Вставка сделки
                    txn.exec_params( "INSERT INTO deals (client_id, resource_id, create_date, scheduled_date, duration) VALUES ($1, $2, NOW(), $3, $4)", client_id, resource_id, dateTime, duration );
                    txn.commit();
                    connection_pool.release(conn);

                    // Инвалидация кэша
                    cache.invalidate("deals");
                    cache.invalidate("tools");
                    cache.invalidate("products");
                    cache.invalidate("services");

                    string success_message = "Сделка успешно создана";
                    session->close(restbed::OK, success_message, { {"Content-Length", to_string(success_message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                }
                catch (const std::exception& e) {
                    string errorMessage = "Ошибка при обработке сделки: ";
                    errorMessage += e.what();
                    session->close(restbed::INTERNAL_SERVER_ERROR, errorMessage, { {"Content-Length", to_string(errorMessage.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
                }
                });
            return;
        }
        // Отсутствие session_id
        string error_message = "Session ID не предоставлен";
        session->close(restbed::BAD_REQUEST, error_message, { {"Content-Length", to_string(error_message.size())}, {"Content-Type", "text/plain; charset=utf-8"} });
    }
}

// Обработчик выхода из системы
void post_method_logout(const shared_ptr<Session> session) {
    string session_id = extract_session_id(session);
    if (!session_id.empty()) {
        try {
            auto conn = connection_pool.acquire();
            pqxx::work txn(*conn);
            txn.exec_params("DELETE FROM sessions WHERE session_id = $1", session_id);
            txn.commit();
            connection_pool.release(conn);
        }
        catch (const std::exception& e) {
            std::cerr << "Ошибка при выходе из системы: " << e.what() << std::endl;
        }
    }

    // Перенаправление на страницу логина и очистка cookie
    restbed::Response response;
    response.set_status_code(restbed::SEE_OTHER);
    response.set_header("Location", "/");
    response.set_header("Set-Cookie", "session_id=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    session->close(response);
}

int main() {
    // Запуск фонового потока для удаления старых сессий
    std::thread scheduler(schedule_cookie_deletion);
    scheduler.detach();

    // Настройка ресурсов
    auto index_resource = make_shared<Resource>();
    index_resource->set_path("/");
    index_resource->set_method_handler("GET", get_index_handler);

    auto logout_resource = make_shared<Resource>();
    logout_resource->set_path("/logout");
    logout_resource->set_method_handler("POST", post_method_logout);

    auto registration_resource = make_shared<Resource>();
    registration_resource->set_path("/register");
    registration_resource->set_method_handler("POST", post_method_registration);

    auto login_resource = make_shared<Resource>();
    login_resource->set_path("/login");
    login_resource->set_method_handler("POST", post_method_login);

    auto success_resource = make_shared<Resource>();
    success_resource->set_path("/PageMain");
    success_resource->set_method_handler("GET", get_success_handler);

    auto table_resource = make_shared<Resource>();
    table_resource->set_path("/Table");
    table_resource->set_method_handler("GET", get_table_handler);

    auto css_resource = make_shared<Resource>();
    css_resource->set_path("/custom.css");
    css_resource->set_method_handler("GET", css_handler);

    auto tools_resource = make_shared<Resource>();
    tools_resource->set_path("/api/tools");
    tools_resource->set_method_handler("GET", get_tools_handler);

    auto products_resource = make_shared<Resource>();
    products_resource->set_path("/api/products");
    products_resource->set_method_handler("GET", get_products_handler);

    auto services_resource = make_shared<Resource>();
    services_resource->set_path("/api/services");
    services_resource->set_method_handler("GET", get_services_handler);

    auto deals_resource = make_shared<Resource>();
    deals_resource->set_path("/api/deals");
    deals_resource->set_method_handler("GET", get_deals_handler);

    auto create_deal_resource = make_shared<Resource>();
    create_deal_resource->set_path("/createDeal");
    create_deal_resource->set_method_handler("POST", post_create_deal_handler);

    // Настройка SSL
    auto ssl_settings = make_shared<restbed::SSLSettings>();
    ssl_settings->set_http_disabled(true);
    ssl_settings->set_port(443);
    ssl_settings->set_certificate(restbed::Uri("file://D:/Projects/DBProject/CRM/DB_Project/Project/certificate.crt"));
    ssl_settings->set_private_key(restbed::Uri("file://D:/Projects/DBProject/CRM/DB_Project/Project/private.key"));

    // Настройки сервера
    auto settings = make_shared<restbed::Settings>();
    settings->set_port(443);
    settings->set_ssl_settings(ssl_settings);
    settings->set_default_header("Connection", "close"); // Закрытие соединения после ответа

    // Создание сервиса и публикация ресурсов
    restbed::Service service;
    service.publish(index_resource);
    service.publish(registration_resource);
    service.publish(login_resource);
    service.publish(success_resource);
    service.publish(table_resource);
    service.publish(tools_resource);
    service.publish(products_resource);
    service.publish(services_resource);
    service.publish(deals_resource);
    service.publish(create_deal_resource);
    service.publish(logout_resource);
    service.publish(css_resource);

    // Запуск сервиса
    service.start(settings);
}