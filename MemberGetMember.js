var usergrid = require('usergrid');
var express = require("express");
var app = express();

var client = new usergrid.client({
    orgName:'gustavobodra',
    appName:'membergetmember',
    authType: usergrid.AUTH_CLIENT_ID,
    clientId:'YXA6PaRAYAGuEeWpHH2IJkmohw',
    clientSecret:'YXA6EJ6F8Dw1Q9oVpyg-vhw5VoUDG78',
});

app.get("/hello", function (req, res){
  var options = {
    type:'members',
    uuid:'63635660-01ae-11e5-9563-833e555965b3'
  }
  client.getEntity(options, function(err, existingUser){
      if (err){
          //error - existing user not retrieved
      } else {
          //success - existing user was retrieved

          var name = existingUser.get('name');
          res.send('Name: ' + name);
      }
  });
});

app.use("/", express.static(__dirname));

app.listen(8888, function (req, res){
  console.log('Server running at 127.0.0.1:8888');
});
