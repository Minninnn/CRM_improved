set(nlohmann_json_DIR "${CMAKE_CURRENT_LIST_DIR}/share/nlohmann_json")

find_package(nlohmann_json REQUIRED CONFIG)

set(nlohmann_json_IMPLICT_CONVERSION OFF)

target_link_libraries(run PRIVATE nlohmann_json::nlohmann_json)