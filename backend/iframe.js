$(document).ready(function() {
  console.log('IFrame ready');
  window.addEventListener('message', authListener);
  function authListener(e) {
    console.log('Having msg ', e);
    var data = e.data;
    var endpoint = data.endpoint;
    var credentials = data.credentials;

    $.ajax({
      type: 'POST',
      data: data.post,
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
        document.open();
        document.write(result);
      }
    }).fail(function(err) {
      $('body').html(JSON.stringify(err));
    });
  }
});
