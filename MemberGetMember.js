var usergrid = require('usergrid');
var express = require("express");
var bodyParser = require('body-parser');
var check = require('check-types');
var async = require('async');
var app = express();

var client = new usergrid.client({
  orgName:'gustavobodra',
  appName:'membergetmember',
  authType: usergrid.AUTH_CLIENT_ID,
  clientId:'YXA6PaRAYAGuEeWpHH2IJkmohw',
  clientSecret:'YXA6EJ6F8Dw1Q9oVpyg-vhw5VoUDG78',
});

app.use(bodyParser.json());

app.post("/invite", function (req, res){

  if (check.unemptyString(req.body.Member.Id)
  && check.unemptyString(req.body.Member.Name)
  && check.unemptyString(req.body.Member.Email)
  && check.unemptyString(req.body.Friend.Name)
  && check.unemptyString(req.body.Friend.Email)
  && check.unemptyString(req.body.Friend.PhoneMobile)
  && check.unemptyString(req.body.Friend.CampaignCode)){

    var inputMember = {
      type:'members',
      Id:req.body.Member.Id,
      Name:req.body.Member.Name,
      Email:req.body.Member.Email
    };

    var inputFriend = {
      type:'friends',
      Name:req.body.Friend.Name,
      Email:req.body.Friend.Email,
      PhoneMobile:req.body.Friend.PhoneMobile,
      CampaignCode:req.body.Friend.CampaignCode
    };

    async.waterfall([
      function(callback) {
        client.createEntity(inputMember, function (err, member){
          if (err){
            console.log("Error while creating member");
          } else {
            member.set('clientId','1');//DUMMY, MUDAR PARA O USUÁRIO DA SESSÃO

            member.save(function (err){
              if (err){
                console.log("Error while saving member");
              } else {
                callback(null, member);
              }
            });
          }
        });
      },
      function(member, callback) {
        client.createEntity(inputFriend, function (err, friend){
          if (err){
            console.log("Error while creating friend");
          } else {
            friend.save(function (err){
              if (err){
                console.log("Error while saving friend");
              } else {
                //TODO: conectar este invitee a uma campanha
                member.connect('invites', friend, function (err, data){
                  if (err){
                    console.log("Error while connecting friend");
                  } else {
                    callback(null, 'done');
                  }
                });
              }
            });
          }
        });
      }
    ], function (err, result) {
      // result now equals 'done'
    });
  } else {
    res.status(400).send("Request does not match with the expected object");
  }
});

app.use("/", express.static(__dirname));

app.listen(8888, function (req, res){
  console.log('Server running at 127.0.0.1:8888');
});
