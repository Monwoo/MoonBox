<?php
$installPassUser="MoonBox";
$installPassCode="42";

// Copyright Monwoo 2017-2018, by Miguel Monwoo, service@monwoo.com
// Inspired from 
// MonwooMarket/silexDemo/tools/installer.php
// Need php > 7.1
// require __DIR__ . '/vendor/autoload.php';
ini_set("memory_limit","500M");
ini_set("post_max_size","500M");
ini_set("upload_max_filesize","500M");
set_time_limit(10000); // 30*60); // 30 minutes wait upload
ini_set('max_execution_time', 10000);
error_reporting(E_ALL);
ini_set('display_errors', 1);
function authenticate() {
    $_SESSION['countRetry']++;
    header('WWW-Authenticate: Basic realm="Authentication System"');
    header('HTTP/1.0 401 Unauthorized');
    echo "You need a valid ID for this resource.\n";
    // var_dump($_SESSION['debug']);
    exit;
}
session_start();
if (!isset($_SESSION['countRetry'])) {
    $_SESSION['countRetry'] = 0;
    $_SESSION['timeStart'] = time();
}
if ($_SESSION['countRetry'] > 5 && time() - $_SESSION['timeStart'] < 3*60) {
    exit;
}
if ($_SESSION['countRetry'] > 5) {
    unset($_SESSION['countRetry']);
}
// https://stackoverflow.com/questions/3663520/php-auth-user-not-set
if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])
&& '' !== $_SERVER['REDIRECT_HTTP_AUTHORIZATION']) {
    list($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW']) =
    explode(':', base64_decode(substr($_SERVER['REDIRECT_HTTP_AUTHORIZATION'], 6)));
    echo "Auth from REDIRECT_HTTP_AUTHORIZATION <hr/>";
}
if (isset($_SERVER['HTTP_AUTHORIZATION'])
&& '' !== $_SERVER['HTTP_AUTHORIZATION']) {
    list($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW']) =
    explode(':', base64_decode(substr($_SERVER['HTTP_AUTHORIZATION'], 6)));
    echo "Auth from HTTP_AUTHORIZATION <hr/>";
}
// if (!isset($_SESSION['debug'])) $_SESSION['debug'] = [];
// $_SESSION['debug'][] = [
//     $_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'], $_SERVER['PHP_AUTH_DIGEST']
//     , $_SERVER['HTTP_AUTHORIZATION'], $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
// ];
if ( !isset($_SERVER['PHP_AUTH_USER'])
|| $installPassUser !== $_SERVER['PHP_AUTH_USER']
|| $installPassCode !== $_SERVER['PHP_AUTH_PW'] // TODO : rewrite own installer.php with user & password selected from form to do that in below section TODO
) {
    authenticate();
} else {
    unset($_SESSION['countRetry']);
    // var_dump($_SESSION);
    // var_dump($_SERVER);
    session_destroy();
    // echo "<p>Bienvenue : " . htmlspecialchars($_SERVER['PHP_AUTH_USER']) . "<br />";
}
$intallablesZip = [];
$dircontents = scandir(__DIR__);
foreach ($dircontents as $file) {
    $extension = pathinfo($file, PATHINFO_EXTENSION);
    if ($extension == 'zip') {
        $intallablesZip[$file] = $file;
    }
}
function recurseRmdir($dir) {
    $files = array_diff(scandir($dir), array('.','..'));
    foreach ($files as $file) {
        (is_dir("$dir/$file")) ? recurseRmdir("$dir/$file") : unlink("$dir/$file");
    }
    return rmdir($dir);
}
$listFileDepth = intval($_GET['list-files-depth'] ?? '5');
$id = 0;
$listFolderFiles = function ($dir, $depth = 0)
use ($listFileDepth, &$listFolderFiles, &$id) {
    if ($depth >= $listFileDepth) {
        echo "<br/>Get param 'list-files-depth' reached, end Scan recursion <br/>";
        return;
    }
    $ffs = scandir($dir);
    unset($ffs[array_search('.', $ffs, true)]);
    unset($ffs[array_search('..', $ffs, true)]);
    // prevent empty ordered elements
    if (count($ffs) < 1)
        return;
    $in = 0 === $id ? 'in' : '';
    // echo "<ol class='collapse in expand$id'>";
    echo "<ol class='collapse $in' id='expand$id'>";
    foreach($ffs as $ff){
        $id++;
        $isDir = is_dir($dir.'/'.$ff);
        $hasSubFolder = false;
        if ($isDir) {
            $ffs = scandir($dir);
            $hasSubFolder = count($ffs) > 2;
        }
        $tag = $isDir && $hasSubFolder ? 'a' : 'strong';
        $detail = $isDir ? "$dir/$ff" : "";
        $title = $isDir ? "[$ff]" : $ff;
        echo '<li>'.<<<TEMPLATE
        <$tag class="in" data-toggle="collapse" href="#expand$id" aria-expanded="false">
        $title
        </$tag>
        <span class='text-secondary'>$detail</span>
TEMPLATE;
        if($isDir) $listFolderFiles($dir.'/'.$ff, $depth + 1);
        echo '</li>';
    }
    echo '</ol>';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <title>MoonBox Installer</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
    <style>
    body {
        font-size: 16pt;
    }
    textarea {
        width: 90%;
        font-size: 12pt;
        color: grey;
        min-height: 300px;}
    </style>
</head>
<body>
    <div class="container">
        <h1>MoonBox Installer</h1>
        <p> by Miguel Monwoo, service@monwoo.com </p>
        <hr/>
        <form enctype="multipart/form-data" name="config_form" method="post"
        class="form-horizontal">
            <div id="config_form">
                <div class="form-group">
                    <label class="col-sm-4 control-label" for="config_form_zip_src">
                        Zip to upload And Install :
                    </label>
                    <div class="col-sm-8">
                        <input type="file" name="config_form[zip_src]" id="config_form_zip_src">
                    </div>
                </div>
                <div class="form-group">
                    <label class="col-sm-4 control-label" for="config_form_delete_itself">
                        Delete Installer :
                    </label>
                    <div class="col-sm-8">
                        <div class="checkbox">
                            <label for="config_form_delete_itself">
                                <input type="checkbox" id="config_form_delete_itself"
                                name="config_form[delete_itself]"
                                value="true"/>
                                Delete MoonBox Installer script & all install Zips
                            </label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="col-sm-4 control-label required"
                    for="config_form_zip_target">
                        Destination folder :
                    </label>
                    <div class="col-sm-8">
                        <input type="text"
                        id="config_form_zip_target"
                        name="config_form[zip_target]"
                        required="required"
                        placeholder="Relative path to install folder output"
                        class="form-control"
                        value="v1" />
                     </div>
                </div>
                <div class="form-group">
                    <label class="col-sm-4 control-label" for="config_form_delete_dst_folder_del">
                        Clear destination :
                    </label>
                    <div class="col-sm-8">
                        <div class="checkbox">
                            <label for="config_form_dst_folder_del">
                                <input type="checkbox" id="config_form_dst_folder_del"
                                name="config_form[dst_folder_del]"
                                value="true"/>
                                Delete Destination folder before extract
                            </label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="col-sm-4 control-label required"
                    for="quality_form_zip_src">
                        Select zip to install :
                    </label>
                    <div class="col-sm-8">
                        <select id="quality_form_zip_src"
                        name="config_form[zip_src]"
                        class="form-control">
                        <?php foreach ($intallablesZip as $name => $path) {
                        echo <<<TEMPLATE
                            <option value="$path" selected="selected">
                            $name
                            </option>
TEMPLATE;
                        } ?>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="col-sm-4">
                </div>
                <div class="col-sm-8">
                    <button type="submit" id="config_form_submit" name="config_form[submit]"
                    class="btn-default btn">Install
                </button>
            </div>
        </div>
    </form>
    <form enctype="multipart/form-data" name="file_manager_form" method="post"
    class="form-horizontal">
    <div id="file_manager_form">
        <div class="form-group">
            <label class="col-sm-4 control-label required"
            for="file_manager_form_delete">
            Delete path :</label>
            <div class="col-sm-8">
                <input type="text"
                id="file_manager_form_delete"
                name="file_manager_form[delete]"
                placeholder="FullPath to delete"
                class="form-control"
                value="" />
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-4 control-label required"
            for="file_manager_form_from">
            Move from Path :    </label>
            <div class="col-sm-8">
                <input type="text"
                id="file_manager_form_from"
                name="file_manager_form[from]"
                placeholder="FullPath to Move from"
                class="form-control"
                value="" />
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-4 control-label required"
            for="file_manager_form_to">To Path :</label>
            <div class="col-sm-8">
                <input type="text"
                id="file_manager_form_to"
                name="file_manager_form[to]"
                placeholder="FullPath to Move to"
                class="form-control"
                value="" />
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-4 control-label" for="file_manager_form_upload">
                Upload File
            </label>
            <div class="col-sm-8">
                <input type="file" name="file_manager_form[upload]"
                id="file_manager_form_upload">
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-4 control-label" for="file_manager_form_upload_target">
                Upload Target
            </label>
            <div class="col-sm-8">
                <input type="text"
                id="file_manager_form_upload_target"
                name="file_manager_form[upload_target]"
                placeholder="FullPath to move the upload file to"
                class="form-control"
                value="" />
            </div>
        </div>
    </div>
    <div class="form-group">
        <div class="col-sm-4">
        </div>
        <div class="col-sm-8">
            <button type="submit" id="file_manager_form_submit" name="file_manager_form[submit]"
            class="btn-default btn">Run File Manager Action</button>
        </div>
    </div>
</form>
<?php
$keepRunningActions = true;
$configForm = array_merge([
    'delete_itself' => null,
    'zip_target' => null,
    'zip_src' => null,
], IsSet($_POST['config_form']) ? $_POST['config_form'] : []);
$fileManagerForm = array_merge([
    'from' => null,
    'to' => null,
    'delete' => null,
    'upload' => null,
    'upload_target' => null,
], IsSet($_POST['file_manager_form']) ? $_POST['file_manager_form'] : []);
$shouldManageFileMove = $fileManagerForm['from'] ??  '';
$shouldManageFileMove .= $fileManagerForm['to'] ??  '';
$shouldManageFileDelete = $fileManagerForm['delete'] ??  '';
$shouldManageFileUpload = $fileManagerForm['upload_target'] ??  '';
$shouldManageFile = $shouldManageFileMove.$shouldManageFileDelete
.$shouldManageFileUpload;
$shouldManageFile = $shouldManageFile !== '';
if ($keepRunningActions && $shouldManageFile) {
    if ($shouldManageFileDelete) {
        $deletePath = $fileManagerForm['delete'];
        if (is_dir($deletePath)) {
            recurseRmdir($deletePath);
            echo "Did delete all files in $deletePath <br/>";
        } else {
            unlink($deletePath);
            echo "Did delete file $deletePath <br/>";
        }
    }
    if ($shouldManageFileUpload) {
        $uploadPath = $fileManagerForm['upload_target'];
        $filename = $_FILES["file_manager_form"]["name"]["upload"];
    	$source = $_FILES["file_manager_form"]["tmp_name"]["upload"];
    	$type = $_FILES["file_manager_form"]["type"]["upload"];
        if (is_dir($uploadPath)) {
            echo "Fail to target upload FILE path (Can't target directory) : $uploadPath <br/>";
        } else {
            if (!is_dir(dirname($uploadPath))) {
                mkdir(dirname($uploadPath), 0777, true);
            }
            move_uploaded_file($source, $uploadPath);
            echo "Did upload $filename to $uploadPath <br/>";
        }
    }
    if ($shouldManageFileMove) {
        rename($fileManagerForm['from'], $fileManagerForm['to']);
        echo "Did rename {$fileManagerForm['from']} to {$fileManagerForm['to']} <br/>";
    }
    $keepRunningActions = false;
}
// var_dump($configForm);
$shouldDeleteItself = $configForm['delete_itself'] ?? false;
if ($keepRunningActions && $shouldDeleteItself) {
    unlink(__FILE__);
    foreach ($intallablesZip as $name => $path) {
        unlink($path);
        echo "Did remove $path <br/>";
    }
    // exit('Did remove: ' . __FILE__);
    echo "Did remove ".__FILE__." <br/>";
    $keepRunningActions = false;
}
$basePath = __DIR__;
// var_dump($_FILES);
$zipSource = null;
if($keepRunningActions && IsSet($_FILES["config_form"]) && $_FILES["config_form"]["name"]["zip_src"]) {
	$filename = $_FILES["config_form"]["name"]["zip_src"];
	$source = $_FILES["config_form"]["tmp_name"]["zip_src"];
	$type = $_FILES["config_form"]["type"]["zip_src"];
	$target_path = $basePath . "/" . $filename;  // change this to the correct site path
	move_uploaded_file($source, $target_path);
    // assert(md5_file($source) === md5_file($target_path),
    // "Uploaded copy differ from the saved one");
    echo "Did upload $filename to $target_path <hr/>";
    $zipSource = $target_path;
}
$zipTarget = $configForm['zip_target'];
$shouldDeleteDstFolder = $configForm['dst_folder_del'] ?? false;
if ($keepRunningActions && $shouldDeleteDstFolder) {
    $dstFolder = $zipTarget;
    if (is_dir($dstFolder)) {
        // Using SPL : http://php.net/manual/en/book.spl.php
        // $di = new RecursiveDirectoryIterator($dstFolder
        // , FilesystemIterator::SKIP_DOTS);
        // $ri = new RecursiveIteratorIterator($di
        // , RecursiveIteratorIterator::CHILD_FIRST);
        // foreach ( $ri as $file ) {
        // Give error : Warning: rmdir(MoonBox/vendor): Directory not empty in
        //     $file->isDir() ?  rmdir($file) : unlink($file);
        // }
        recurseRmdir($dstFolder);
        echo "File & directory in $dstFolder => all deleted OK <br/>";
    } else {
        echo "$dstFolder do not exist yet <br/>";
    }
}
$zipSource = $zipSource ?? $configForm['zip_src'];
// var_dump($_POST);
if ($keepRunningActions && $zipSource && "" !== $zipSource) {
    if (!file_exists($zipSource)) {
        echo "No zip at $zipSource found <hr/>";
        exit;
    }
    echo "Extracting $zipSource to $zipTarget <hr/>";
    // Installion code
    $zip = new ZipArchive; // Native Php one may not extract all file, use lib...
    $res = $zip->open($zipSource);
    if ($res === TRUE) {
        $zip->extractTo($zipTarget);
        $zip->close();
    } else {
        echo 'MoonBox Install Source not found <hr/>';
        exit;
    }
    // // Same with lib, seem like if archive > 100Mo it start failing extraction...
    // $zipFile = new \PhpZip\ZipFile();
    // $zipFile
    // ->openFile($zipSource) // open archive from file
    // ->extractTo($zipTarget);
    // TODO : create admin user link to insall-default-admin.php ? => not done on each insall, on demand
    // TODO : link to admin install tests to let admin check all did get installed ok
    echo 'MoonBox Installed from Zip OK ! <hr/>';
}
$listFolderFiles(__DIR__);
?>
    </div>
    <footer>
        <br>
        <hr>
        <notice class="starter-copyright-author">
            <strong>MoonBox : © Copyright Monwoo 2017-2018</strong>
            <div>MoonBox via <a href="http://www.monwoo.com" target="_blank">www.monwoo.com</a>, workload starting at 2€/min.</div>
            <div>MoonBox Provided by Miguel Monwoo under M.I.T on an "AS IS" BASIS, <br>WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.</div>
        </notice>
    </footer>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
</body>
</html>