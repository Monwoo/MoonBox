// Copyright Monwoo 2017-2018, by Miguel Monwoo, service@monwoo.com

$(document).ready(function() {
  // console.log('IFrame ready');
  window.addEventListener('message', authListener);
  function authListener(e) {
    // console.log('Having msg ', e);
    var data = e.data;
    var endpoint = data.endpoint;
    var credentials = data.credentials;
    var mimeType = e.MIME || 'text/plain';
    // https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy#Changing_origin
    document.domain = data.domain; // not enough to allow partent to access iframe size...

    $.ajax({
      type: 'POST',
      data: data.post,
      dataType: 'text',
      url: endpoint,
      beforeSend: function(xhr) {
        xhr.withCredentials = true;
        xhr.setRequestHeader('Authorization', 'Bearer ' + credentials);
      },
      success: function(result) {
        // var d = document;d.getElementsByTagName('head')[0].
        // appendChild(d.createElement('script')).innerHTML =
        // 'document.open();'
        // + 'document.write(JSON.parse(decodeURIComponent('
        // + '  \"" . rawurlencode(json_encode($msgBody)) . "\"'
        // + ')));'
        // + 'document.close();';
        // document.open();
        document.open(mimeType);
        document.write(result);
        window.parent.postMessage(
          {
            from: 'IFrameLoading',
            to: data.index,
            height: document.body.scrollHeight
          },
          data.url
        );
      }
    }).fail(function(err) {
      $('body').html(JSON.stringify(err));
    });
  }
});
