<?php
// Copyright Monwoo 2018, by Miguel Monwoo, service@monwoo.com

// To put under production, set debug to False AND preprod to False...

$config = [
    'debug' => true, // if true, will switch from config.prod.php to config.dev.php
    'preprod' => true, // if true, will switch from config.prod.php to config.preprod.php
    'loggerName' => "MoonBoxLog",
    'sessionTimeOut' => 21 * 24 * 60, // Session life time in secondes
    'authTimeOut' => 21 * 60, // Session life time in secondes
    'gApiCredentialPath' => "client_secret.json",
];

