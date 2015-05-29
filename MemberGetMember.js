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
      res.send({clientToken:client.token});
    }
  });
});

app.post("/invite", function (req, res){
  if (check.unemptyString(client.token)){
    if (check.unemptyString(req.body.Member.Id)
    && check.unemptyString(req.body.Member.FullName)
    && check.unemptyString(req.body.Friend.FullName)
    && check.unemptyString(req.body.Friend.Id)
    && check.unemptyString(req.body.Friend.PhoneMobile)
    && check.unemptyString(req.body.Friend.CampaignCode)){

      var inputMember = {
        type:'members',
        FullName:req.body.Member.FullName,
        name:req.body.Member.Id,
        getOnExist:true
      };

      var inputFriend = {
        type:'friends',
        FullName:req.body.Friend.FullName,
        name:req.body.Friend.Id,
        PhoneMobile:req.body.Friend.PhoneMobile,
        CampaignCode:req.body.Friend.CampaignCode,
        getOnExist:true
      };

      async.waterfall([
        function(callback) { //SALVA O OBJETO MEMBER NA BASE
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
        function(member, callback) { //SALVA O OBJETO FRIEND NA BASE
          client.createEntity(inputFriend, function (err, friend){
            if (err){
              console.log("Error while creating friend");
            } else {
              friend.save(function (err){
                if (err){
                  console.log("Error while saving friend");
                } else {
                  var memberFriend = {
                    memberData:member,
                    friendData:friend
                  };

                  callback(null, memberFriend);
                }
              });
            }
          });
        }
      ], function (err, result) { //FAZ OS RELACIONAMENTOS NECESSÁRIOS
        var friend = result.friendData;
        var member = result.memberData;

        async.parallel([
          function (callback){
            var retrievalObj = {
              type: 'campaign',
              uuid:inputFriend.CampaignCode
            };

            client.getEntity(retrievalObj, function (err, campaign){ //RELACIONAMENTOS COM O OBJETO CAMPANHA
              if (err){
                console.log("Error while loading campaign object");
              } else {
                async.parallel([
                  function (callback){
                    friend.connect('belongs', campaign, function (err, data) {
                      if (err){
                        console.log("Error while connecting friend to campaign");
                      }
                    });
                  },
                  function (callback){
                    member.connect('belongs', campaign, function (err, data) {
                      if (err){
                        console.log("Error while connecting member to campaign");
                      }
                    });
                  }
                ]);
              }
            });

            callback(null,'one');
          },
          function (callback){ // RELACIONAMENTO ENTRE MEMBER E FRIEND
            member.connect('invites', friend, function (err, data){
              if (err){
                console.log("Error while connecting friend");
              }
            });

            callback(null, 'two');
          }
        ],
        function (err, result){
          var output = {
            memberUuid:member.get('uuid'),
            friendUuid:friend.get('uuid')
          };
          res.send(output);
        });
      });
    } else {
      res.status(400).send("Request does not match with the expected object");
    }
  } else {
    res.status(401).send("Please login to use the API");
  }
});

app.post("/discount", function (req, res){
  if (check.unemptyString(client.token)){
    if (check.unemptyString(req.body.type)
    && check.unemptyString(req.body.uuid)){

      var query = {
        type:req.body.type,
        uuid:req.body.uuid
      };

      client.getEntity(query, function(err, entity){
        if (err){
          res.send("Erro1");
        } else {
          entity.getConnections('belongs', function (error, connections) {
            if (error) {
              res.send("Erro2");
            } else {
              res.send(connections.entities);
            }
          });
        }
      });

    }
  } else {
    res.status(401).send("Please login to use the API");
  }
});

app.use("/", express.static(__dirname));

app.listen(8888, function (req, res){
  console.log('Server running at 127.0.0.1:8888');
});
