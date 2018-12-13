<?php
// Copyright Monwoo 2017, by Miguel Monwoo, service@monwoo.com
namespace Monwoo\Middleware;
class AddingCors {
    public static function addCors($request, $response)
    {
        $http_origin = array_key_exists('HTTP_ORIGIN', $_SERVER) ? $_SERVER['HTTP_ORIGIN'] : null;

        if ($http_origin == "http://www.monwoo.com"
            || $http_origin == "http://monwoo.com"
            || $http_origin == "http://127.0.0.1:4200"
            || $http_origin == "http://localhost:4200")
        {
            // header("Access-Control-Allow-Origin: $http_origin");
            // header('Access-Control-Allow-Credentials: true');
            // header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            // // header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
            // header('Access-Control-Allow-Headers: Origin, Content-Type, X-Auth-Token, Accept');
            // //header('Content-type: application/json');

            $response->headers->set('Access-Control-Allow-Origin', $http_origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token, Accept');
        }
    }
}