const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = function (eodEmails, eodReport, withBcc = true){
    let mail = {
        title: "Arbitrage App - End of Day " + eodReport["period"],
        body: function () {
            return "<h1>" + this.title + "</h1>" +
                "<h3>IzyHacktonTeam 3 - End of day " + eodReport["period"] + "</h3>" +
                "<p>Dear admin, End of day file for " + eodReport["period"] + " was generated.</p>" +
                "<p><a href='" + eodReport["url"] + "'>Click here to download End of day file for " + eodReport["period"] + "</a>.</p>" +
                "<p>IzyHackton Team 3</p>";
        }
    };
    console.error(eodEmails);
    for (const email of eodEmails) {
        _sendMail_SendGrid(email, mail.title, mail.body(), null, withBcc);
    }
}

const _sendMail_SendGrid = function (to, subject, html, done, withBcc = true) {
    const msg = {
        from: 'IzyHacktonTeam3 <FROM>'.replace("FROM", process.env.DEV_EMAIL),
        to: to,
        reply_to: process.env.DEV_EMAIL,
        subject: subject,
        html: html,
    };
    if (withBcc) {
        msg.bcc = process.env.DEV_EMAIL;
    }
    sgMail.send(msg)
        .then((res)=>{
            //console.log(res);
            console.log("Send mail success (SENDGRID)");
            if (done!=null) done(null, 0);
        })
        .catch((err)=>{
            console.log(err);
            console.log("Send mail ERROR (SENDGRID) - " + err.message);
        });
};

module.exports = sendMail
