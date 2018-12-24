// Work in progress, done by Miguel Monwoo, service@monwoo.com

// TODO : work in progress
// Inspired from MonwooMarket/silexDemo/src/MonwooConnector/Provider/ImapDataProvider.php

$client = new \Google_Client();
        $client->setAuthConfig($app[
            "{$self->manager_route_name}.gapi_credential"
        ]);
        $client->setRedirectUri($redirect_uri);
        $client->addScope(\Google_Service_Gmail::GMAIL_READONLY); // For gapi connections
        $client->addScope(\Google_Service_Gmail::MAIL_GOOGLE_COM); // For google imap connections : https://mail.google.com/
        // $client->setApplicationName("Monwoo Imap Data Connector");
        $client->setAccessType('offline');
        // TODO : Can have only one gapi account access for now, ok, only need one gmail and multiple regular imap account for now
        // TODO : need improve design to handle access_token by connection
        // and find a way to iterate over connextion loading with auth system
        // in the middle...
        $accessToken = $self->getSession('access_token'); // Better secu if from file than from session ? well, token is already random generated stuff
        // $accessToken = false; // TODO : have a way to manually reset accessToken & mail cache
        if (isset($accessToken['access_token'])) {
            $client->setAccessToken($accessToken);
            if ($client->isAccessTokenExpired()) {
                $refreshToken = $client->getRefreshToken();
                if ($refreshToken) {
                    $client->fetchAccessTokenWithRefreshToken($refreshToken);
                    $accessToken = $client->getAccessToken();
                    if (isset($accessToken['access_token'])) {
                        $self->setSession('access_token', $accessToken);
                    } else {
                        // * DEBUG
                        $app['debug.logger']->debug('Refresh Access token fail', [
                            'accessToken' => $accessToken,
                        ]);
                        // */
                        $accessToken = false;
                    }
                } else {
                    // * DEBUG
                    $app['debug.logger']->debug('Fetching Refresh Access token fail', [
                        'accessToken' => $accessToken,
                    ]);
                    // */
                    $accessToken = false;
                }
            }
        } else {
            // * DEBUG
            $app['debug.logger']->debug('Last saved Access token is badly build', [
                'accessToken' => $accessToken,
            ]);
            // */
            $accessToken = false;
        }
