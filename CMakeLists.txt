cmake_minimum_required(VERSION 3.20)
project(DBProject VERSION 1.0 LANGUAGES CXX)

add_compile_options(
    -Wall
)

set(CMAKE_CXX_STANDARD 17)

if(NOT CMAKE_CXX_EXTENSIONS)
	set(CMAKE_CXX_EXTENSIONS OFF)
endif()

add_subdirectory(src)

add_subdirectory(doc)

add_subdirectory(libs)