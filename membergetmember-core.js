var usergrid = require('usergrid');
var express = require("express");
var bodyParser = require('body-parser');
var check = require('check-types');
var async = require('async');
var moment = require('moment');
var cors = require('cors');
var winston = require('winston');
var mail = require('./membergetmember-utils-email');

/* INITIAL SETUPS */
var app = express();
app.use(bodyParser.json({ type: '*/*' }));
app.use(cors( { origin: 'http://membergetmember.badulakka.com.br' } ));
winston.add(winston.transports.File, { filename: 'errors.log' });
winston.remove(winston.transports.Console);

app.post("/logon", function(req, res){
	var client = new usergrid.client({
		orgName:'gustavobodra',
		appName:'membergetmember',
		authType: usergrid.AUTH_APP_USER
	});
	console.log(req.body);
	
	client.login(req.body.Username, req.body.Password, function (err, response){
		if (err){
			winston.error("Error while authenticating user|" + JSON.stringify(req.body));
			res.status(500).send("Erro ao autenticar usuário");
			} else {
			res.send({token:client.token});
		}
	});
});

app.post("/invite", function (req, res){
	if (check.unemptyString(req.body.token)){
		
		var client = new usergrid.client({
			orgName:'gustavobodra',
			appName:'membergetmember',
			authType: usergrid.AUTH_APP_USER,
			token:req.body.token
		});
		
		if (check.unemptyString(req.body.Member.Id)
		&& check.unemptyString(req.body.Member.FullName)
		&& check.unemptyString(req.body.Friend.FullName)
		&& check.unemptyString(req.body.Friend.Id)
		&& check.unemptyString(req.body.Friend.PhoneMobile)
		&& check.unemptyString(req.body.Friend.CampaignCode)){
			
			var inputMember = {
				type:'members',
				FullName:req.body.Member.FullName,
				name:req.body.Member.Id
			};
			
			var inputFriend = {
				type:'friends',
				FullName:req.body.Friend.FullName,
				name:req.body.Friend.Id,
				PhoneMobile:req.body.Friend.PhoneMobile
			};
			
			async.waterfall([
			function(callback) { //SALVA O OBJETO MEMBER NA BASE
				client.createEntity(inputMember, function (err, member){
					if (err){
						winston.error("Error while creating member|" + JSON.stringify(inputMember));
						} else {
						member.set('clientId','1');//DUMMY, MUDAR PARA O USUÁRIO DA SESSÃO
						
						member.save(function (err){
							if (err){
								winston.error("Error while saving member|" + JSON.stringify(inputMember));
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
						winston.error("Error while creating friend|" + JSON.stringify(inputFriend));
						} else {
						friend.save(function (err){
							if (err){
								winston.error("Error while saving friend|" + JSON.stringify(inputFriend));
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
						uuid:req.body.Friend.CampaignCode
					};
					
					client.getEntity(retrievalObj, function (err, campaign){ //RELACIONAMENTOS COM O OBJETO CAMPANHA
						if (err){
							winston.error("Error while loading campaign object|" + JSON.stringify(campaign));
							} else {
							async.parallel([
							function (callback){
								friend.connect('belongs', campaign, function (err, data) {
									if (err){
										winston.error("Error while connecting friend to campaign|" + JSON.stringify(friend) + "|" + JSON.stringify(campaign));
									}
								});
							},
							function (callback){
								member.connect('belongs', campaign, function (err, data) {
									if (err){
										winston.error("Error while connecting member to campaign|" + JSON.stringify(member) + "|" + JSON.stringify(campaign));
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
							winston.error("Error while connecting friend|" + JSON.stringify(member) + "|" + JSON.stringify(campaign));
						}
					});
					
					callback(null, 'two');
				},
				function (callback) {
					var message = {
						"html": "<p>Example HTML content</p>",
						"subject": "Seu amigo " + member.get("FullName") + " te indicou!",
						"from_email": "contato@badulakka.com.br",
						"from_name": "Member Get Member",
						"to": [{
							"email": friend.get("name"),
							"name": friend.get("FullName"),
							"type": "to"
						}],
						"global_merge_vars": [
						{
							"name": "FRIEND",
							"content": friend.get("FullName")
						},
						{
							"name": "MEMBER",
							"content": member.get("FullName")
						}
					]};
					mail.sendMail(message);
					
					callback(null, 'three');
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
			winston.info("Request does not match with the expected object");
			res.status(400).send("Request does not match with the expected object");
		}
		} else {
		winston.info("Please login to use the API|" + JSON.stringify(req.body));
		res.status(401).send("Please login to use the API");
	}
});

app.post("/discount", function (req, res){
    if (check.unemptyString(req.body.token)){
		
		var client = new usergrid.client({
			orgName:'gustavobodra',
			appName:'membergetmember',
			authType: usergrid.AUTH_APP_USER,
			token:req.body.token
		});
		
		if (check.unemptyString(req.body.type)
		&& check.unemptyString(req.body.uuid)){
			
			var query = {
				type:req.body.type,
				uuid:req.body.uuid
			};
			
			client.getEntity(query, function(err, entity){
				if (err){
					winston.error("Error while getting the member/friend data|" + JSON.stringify(query));
					} else {
					entity.getConnections('belongs', function (error, connections) {
						if (error) {
							winston.error("Error while fetching connections|" + JSON.stringify(entity));
							} else {
							var bestDiscount = { discount:0 };
							var discountType = req.body.type;
							
							console.log(connections.entities);
							
							connections.entities.forEach(function (campaign){
								var timestamp = moment.utc().valueOf();
								
								console.log(timestamp);
								console.log(campaign.StartDate);
								console.log(campaign.EndDate);
								
								if (timestamp >= campaign.StartDate && timestamp <= campaign.EndDate){
									if (discountType == "members"){
										if (campaign.MemberDiscount > bestDiscount.discount){
											bestDiscount.discount = campaign.MemberDiscount;
										}
										} else {
										if (campaign.FriendDiscount > bestDiscount.discount){
											bestDiscount.discount = campaign.FriendDiscount;
										}
									}
								}
							});
							
							res.send(bestDiscount);
						}
					});
				}
			});
			
		}
		} else {
		winston.info("Please login to use the API|" + JSON.stringify(req.body));
		res.status(401).send("Please login to use the API");
	}
});

app.use("/", express.static(__dirname));

app.listen(8888, function (req, res){
	console.log('Server running at 127.0.0.1:8888');
});
