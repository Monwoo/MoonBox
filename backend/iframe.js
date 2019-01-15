// Copyright Monwoo 2017-2018, by Miguel Monwoo, service@monwoo.com

// $(document).ready(function() {
// console.log('IFrame ready');
window.addEventListener('message', authListener);
function authListener(e) {
  // console.log('Having msg ', e);
  var data = e.data;
  var endpoint = data.endpoint;
  var credentials = data.credentials;
  var mimeType = e.MIME || 'text/html'; // 'text/plain';
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
      // window.onload = function () {
      var container = document.open(mimeType);
      var lastSize = 0;
      // container.onload = function () {
      var sendScrollHeight = function() {
        var newSize = container.body.scrollHeight;
        if (newSize !== lastSize) {
          window.parent.postMessage(
            {
              from: 'IFrameLoading', // TODO : better id system, ok since no // loads....
              to: data.index,
              height: newSize
              // height: document.body.scrollHeight
            },
            data.url
          );
          lastSize = newSize;
        }
      };

      $(container).ready(function() {
        sendScrollHeight(); // Send current heigh
        // Below hack not usable : putting new size is what's makes email content bigger...
        // => seem like <pre> tag enclose 'html' body type => Need backend checks...
        // setTimeout(sendScrollHeight, 2000); // quick fix hack, seem resize or innersize do not fit perfectly...
      });
      $(container).resize(sendScrollHeight);
      document.write(result);
    }
  }).fail(function(err) {
    $('body').html(JSON.stringify(err));
  });
}
// });
