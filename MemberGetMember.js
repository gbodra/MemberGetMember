var usergrid = require('usergrid');
var express = require("express");
var bodyParser = require('body-parser');
var check = require('check-types');
var async = require('async');
var app = express();

var client = new usergrid.client({
  orgName:'gustavobodra',
  appName:'membergetmember',
  authType: usergrid.AUTH_APP_USER
});

app.use(bodyParser.json());

app.post("/logon", function(req, res){
  client.login(req.body.Username, req.body.Password, function (err, response){
    if (err){
      res.send("Erro ao autenticar usuário");
    } else {
      res.send(client.token);
    }
  });
});

app.post("/invite", function (req, res){
  if (check.unemptyString(client.token)){
    if (check.unemptyString(req.body.Member.Id)
    && check.unemptyString(req.body.Member.FullName)
    && check.unemptyString(req.body.Member.Email)
    && check.unemptyString(req.body.Friend.FullName)
    && check.unemptyString(req.body.Friend.Email)
    && check.unemptyString(req.body.Friend.PhoneMobile)
    && check.unemptyString(req.body.Friend.CampaignCode)){

      var inputMember = {
        type:'members',
        Id:req.body.Member.Id,
        FullName:req.body.Member.FullName,
        Email:req.body.Member.Email
      };

      var inputFriend = {
        type:'friends',
        FullName:req.body.Friend.FullName,
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

                  async.parallel([
                    function (callback){
                      var retrievalObj = {
                        type: 'campaign',
                        uuid:inputFriend.CampaignCode
                      };

                      client.getEntity(retrievalObj, function (err, campaign){
                        if (err){
                          console.log("Error while loading campaign object");
                        } else {
                          friend.connect('belongs', campaign, function (err, data) {
                            if (err){
                              console.log("Error while connecting friend to campaign");
                            }
                          });
                        }
                      });
                    },
                    function (callback){
                      member.connect('invites', friend, function (err, data){
                        if (err){
                          console.log("Error while connecting friend");
                        }
                      });
                    }
                  ],
                  function (err, results){
                    callback(null, 'done');
                  });
                }
              });
            }
          });
        }
      ], function (err, result) {
        console.log("Fim");
      });
      res.send("Fim");
    } else {
      res.status(400).send("Request does not match with the expected object");
    }
  } else {
    res.status(401).send("Please login to use the API");
  }
});


app.use("/", express.static(__dirname));

app.listen(8888, function (req, res){
  console.log('Server running at 127.0.0.1:8888');
});
