set(unofficial-restbed_DIR "${CMAKE_CURRENT_LIST_DIR}/share/unofficial-restbed")

find_package(unofficial-restbed REQUIRED CONFIG)

target_link_libraries(run PRIVATE unofficial::restbed::restbed)