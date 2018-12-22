<?php
// Copyright Monwoo 2018, by Miguel Monwoo, service@monwoo.com

$root_dir = __DIR__;
$pharName = 'moonBox.tar.phar';
$pharPath = "$root_dir/$pharName";
assert(file_exists($pharPath), "Phar not Found");
if (!file_exists($pharPath)) {
  exit("Missing phar file.");
}
try {
  // $p = new Phar($pharPath
  // , FilesystemIterator::CURRENT_AS_FILEINFO
  // | FilesystemIterator::KEY_AS_FILENAME,
  // $pharName);
  include $pharPath;
  // require "phar://$pharPath/index.php";
  // require "phar://$pharPath/vendor/autoload.php";
} catch (UnexpectedValueException $e) {
  var_dump($e);
  throw new \Exception("Ne peut pas ouvrir $pharPath");
} catch (BadMethodCallException $e) {
  var_dump($e);
  throw new \Exception('techniquement, ça ne peut pas arriver');
}
