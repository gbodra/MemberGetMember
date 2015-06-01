var mandrill = require('mandrill-api/mandrill');

//Private
mandrill_client = new mandrill.Mandrill('MryFIwjzxO0ZP0IK-Rg_Hg');

var self = module.exports = {
  sendMail: function sendMail(message) {
    mandrill_client.messages.sendTemplate({ "template_name":"Invitation", "template_content":"", "message": message, "async": false, "ip_pool": "", "send_at": ""}, function(result) {
      /*
      [{
      "email": "recipient.email@example.com",
      "status": "sent",
      "reject_reason": "hard-bounce",
      "_id": "abc123abc123abc123abc123abc123"
    }]
    */
  }, function(e) {
    // Mandrill returns the error as an object with name and message keys
    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
    // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
  });
}
};
