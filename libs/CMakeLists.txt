add_subdirectory(libpqxx)
set(PostgreSQL_ADDITIONAL_VERSIONS "17")

add_subdirectory(asio)

add_subdirectory(nlohmann-json)

add_subdirectory(openssl)

add_subdirectory(restbed)

add_subdirectory(vcpkg-cmake)

add_subdirectory(vcpkg-cmake-config)

add_subdirectory(vcpkg-cmake-get-vars)


target_link_libraries(run PRIVATE pqxx)