// Copyright Monwoo 2017-2018, by Miguel Monwoo, service@monwoo.com

$(document).ready(function() {
  // console.log('IFrame GApiAuthResponse ready');
  // https://davidwalsh.name/window-iframe
  // https://www.plus2net.com/javascript_tutorial/window-child3.php

  var frontendUrl = $('#boot-script').data('frontend-baseurl');
  opener.postMessage(
    {
      from: 'GApiAuthResponse',
      succed: true
    },
    frontendUrl
  );
  // window.close(); // closing popup commented since will be close by parent, showing all did went ok
});
