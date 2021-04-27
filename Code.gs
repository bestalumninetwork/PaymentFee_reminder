/**
 * Gets payment information from the MemberList spreadsheet, returns an array of all the rows.
 * @returns: payment data from the payments spreadsheet as a list of rows
 * Source: https://developers.google.com/sheets/api/quickstart/apps-script
 */
function getPaymentData() {

    var LOGGING_PREFIX = '[getPaymentData] \t';

    Logger.log(LOGGING_PREFIX + 'started');

  //Url of the Membership spreadsheet (in future if spreedsheep changes, update only the url)
   let url = "https://docs.google.com/spreadsheets/d/13YSSxKWzS8khlm_oMfDNcDCsW6SgVtjNJlA1q8zpoTI/edit#gid=0";
   //retrieve the id of the spreadsheet from the url
  const paymentSpreadSheetId = url.match("/spreadsheets/d/([a-zA-Z0-9-_]+)")[1];
    var dataRange = "'List of members'!A2:Y";; // <SHEET_NAME>!<RANGE_START>:<RANGE_END>
    var payments = Sheets.Spreadsheets.Values.get(paymentSpreadSheetId, dataRange).values;

    if (!payments) {
        Logger.log(LOGGING_PREFIX + 'no payment data found in spreadsheet.') 
    }
    Logger.log(LOGGING_PREFIX + 'payment data retrieved from spreadsheet.');

    return payments;
}

/**
 * This method selects the Membership end date (column N or O for stripe) from the payments spreadsheet for a given user.
 * @param user: user object from the google admin directory
 * @param payments: payment data from the payments spreadsheet as a list of rows
 * @returns: date up to which the account is valid
 */
function getAccountValidityEndDate(user, payments) {

    var LOGGING_PREFIX = '[getAccountValidityEndDate] ';
    // Logger.log(LOGGING_PREFIX + 'started');

    if (!payments) {
      Logger.log(LOGGING_PREFIX + 'No payment data given!');
      return
    }

    var validityEndDate = null;

    try {
        var userId = user.externalIds[0].value; // User ID used to identify the payments associated to this user
    } catch (error) {
        Logger.log(LOGGING_PREFIX + 'Cannot get ID from user: ' + JSON.stringify(user));
        return;
    }
     var stripe = false;
     let row = payments.find((row) => row[0] == userId); //Match user with payment info

      if(row) validityEndDate = row[13];  //get membership end date
       
      if (validityEndDate === 'Stripe') {
        validityEndDate = row[14];
        stripe = true;
      }
      if (!validityEndDate) {
        Logger.log(LOGGING_PREFIX + 'No validity end date found for user ' + user.name.fullName + ' [' + userId + '].');
      }
      

    return{validityEndDate, stripe};
}

/*
 * This functions changes the format of a date string from 18.09.2013 to 2013-09-18
 */
function reformatDateString(dateStr) {

    var LOGGING_PREFIX = 'reformatDateString';

    var elements = dateStr.split('.');
    if (elements.length !== 3) {
        Logger.log(LOGGING_PREFIX + 'Invalid date ' + String(dateStr) + '.');
        return;
    }

    elements = elements.reverse();

    return elements.join('-');
}

/**
 * If the number of e-mails that can be send by the script drops below 20, the admins will be informed.
 */
function checkDailyEMailQuota() {

    var LOGGING_PREFIX = 'checkDailyEMailQuota';

    var emailQuotaRemaining = MailApp.getRemainingDailyQuota();
    Logger.log(LOGGING_PREFIX + 'Remaining email quota: ' + emailQuotaRemaining); // todo: remove after testing

    if (emailQuotaRemaining < 21) {
        MailApp.sendEmail('admin@bestalumni.net', 'Warning E-Mail Quota Limit', 'The google app script "check for upcoming renewal" will soon reach its E-Mail quota limit!');
        // Todo: refactor this, so that the email addresses of membres that could not have an email send to will be logged and included in the message.
    }

}

/**
 * This function sends ount an e-mail if a users account is about to expire.
 * @param user: user object from the google admin directory
 * @param validityEndDate: Date Object
 */
function sendMembershipRenewalEMail(user, validityEndDate, stripe=false) {

    var LOGGING_PREFIX = 'sendMembershipRenewalEMail';

    checkDailyEMailQuota();

    var validityEndString = Utilities.formatDate(validityEndDate, 'CET', 'dd/MM/yyyy');

    // checking the users secondary e-mail address
    var secondaryEmailAddress = user.recoveryEmail;
    if (!secondaryEmailAddress) {
        for (var email of user.emails) {
            if ((email.address != user.primaryEmail) && !email.address.includes('bestalumni.net')){
                secondaryEmailAddress = email.address; 
            }
        }
    }

    var recipient = user.primaryEmail;
    var subject = 'BEST Alumni Network - Renew your membership !';
    //Send differendt mails for stripe users
    var content = stripe? makeStripeRenewalEMailContent(user.name.fullName, validityEndString): makeRenewalEMailContent(user.name.fullName, validityEndString);
    var options = {
        'cc': secondaryEmailAddress,
        'bcc': 'admin@bestalumni.net',
        'replyTo': 'membership@bestalumni.net'
    };

    MailApp.sendEmail(recipient, subject, content, options);

}


/**
 * This functions sends a summary to admin@bestalumni.net at the end of this scripts execution
 * @param error_accounts
 */
function sendSummaryEMail(error_accounts, expired_accounts, reminded_accounts) {

    var LOGGING_PREFIX = 'sendSummaryEMail';

    checkDailyEMailQuota();

    var recipient = 'miriam.mazzeo@bestalumni.net';
    var subject = 'Membership renewal summary';
    var content = makeSummaryEMailContent(error_accounts, expired_accounts, reminded_accounts);

    MailApp.sendEmail(recipient, subject, content);

}

/**
 * This function checks which BAN member's accounts expire in one month
 * It is run periodically by a trigger.
 */
function mainfunc() {

    var LOGGING_PREFIX = '[main] ';

    Logger.log(LOGGING_PREFIX + 'started');

    /*
    Running a Google App Script periodically:
    Edit -> Current projects triggers
    */

    // Getting all payments from the google spreadsheet
    var payments = getPaymentData();

    /*
    Go through all users of the G Suite Directory
    Documentation on Admin Directory
    - quick start guide: https://developers.google.com/admin-sdk/directory/v1/quickstart/apps-script
    - developers guide:  https://developers.google.com/admin-sdk/directory/v1/guides/guides
    - api reference:     https://developers.google.com/admin-sdk/directory/v1/reference
    - code snippet:      https://developers.google.com/apps-script/advanced/admin-sdk-directory#list_all_users
    */
    var optionalArgs = {
        customer: 'my_customer',
        maxResults: 500, // TODO: this could cause a problem in the future, when BAN gets more than 500 members. How to handle that?
        orderBy: 'email'
    };

    var response = AdminDirectory.Users.list(optionalArgs);
    var users = response.users;

    // check for every user if his account expires in the next month.
    var today = new Date();
    //let [month, date, year]    = today.toLocaleDateString("en-US").split("/"); // To get Date, Month and Year or Time
    var oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    var oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate()+1);

    var oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate()+7);


    var error_accounts = []; // List of accounts that can not be evaluated by the script for one reason or another
    var expired_accounts = []; // List of Users who's accounts have expired
    var reminded_accounts = []; // List of Users that have been reminded of their upcoming membership renewal

    // Logger.log(LOGGING_PREFIX + 'today = ' + Utilities.formatDate(today, 'CET', 'yyyy-MM-dd')); // TODO: remove after testing.
    // Logger.log(LOGGING_PREFIX + 'oneMonthFromNow = ' + Utilities.formatDate(oneMonthFromNow, 'CET', 'yyyy-MM-dd')); // TODO: remove after testing.

    if (users && users.length > 0) {
        Logger.log(LOGGING_PREFIX + users.length + ' users found.');
        for (let user of users) {

            // Get the membership expiry date accoeding to the payment spreadsheet
            let {validityEndDateStr, stripe} = getAccountValidityEndDate(user, payments);
            if (!validityEndDateStr) {
                Logger.log(LOGGING_PREFIX + 'Could not detemine date of validity for ' + user.primaryEmail + '.');
                error_accounts.push(user.primaryEmail.toString());
                continue;
            }
            let validityEndDate = new Date(reformatDateString(validityEndDateStr));
            let formatedValidityDate1 = Utilities.formatDate(validityEndDate, 'CET', 'dd.MM.yyyy');
            let formatedValidityDate2 = Utilities.formatDate(validityEndDate, 'CET', 'yyyy.MM.dd');

            // deactivate the account if the validity end date is in the past
            if (validityEndDate.getTime() < today.getTime()) {
                Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account is already expired: ' + formatedValidityDate2);
                //Do we have to add notifications of accounts that we already know off ?????
                expired_accounts.push(user.primaryEmail.toString() + ' ' + formatedValidityDate1);
                // send a reminder E-Mail if the account expires today in one month.
            } else if (formatedValidityDate2 == Utilities.formatDate(oneMonthFromNow, 'CET', 'yyyy-MM-dd' && !stripe)) {
                Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account will expire one month from now: ' + formatedValidityDate2); // TODO: remove after testing.

                // send an e-mail to the user if his / her account will expire in one month
                sendMembershipRenewalEMail(user, validityEndDate);
                reminded_accounts.push(user.primaryEmail.toString() + ' ' + formatedValidityDate1);

                // send a reminder E-Mail if the account expires tomorrow.
            } else if (formatedValidityDate2 == Utilities.formatDate(oneDayFromNow, 'CET', 'yyyy-MM-dd' && !stripe )) {
                Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account will expire tomorrow: ' + formatedValidityDate2); // TODO: remove after testing.
                // send an e-mail to the user if his / her account will expire in one month
                sendMembershipRenewalEMail(user, validityEndDate);
                reminded_accounts.push(user.primaryEmail.toString() + ' ' + formatedValidityDate1);
                // send a reminder E-Mail if the account expires tomorrow.
            } else if (formatedValidityDate2 == Utilities.formatDate(oneWeekFromNow, 'CET', 'yyyy-MM-dd' && stripe )) {
                Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account will expire in one week: ' + formatedValidityDate2); // TODO: remove after testing.

                // send an e-mail to stripe subcription 1 week before expiry.
                sendMembershipRenewalEMail(user, validityEndDate, true);
                reminded_accounts.push(user.primaryEmail.toString() + ' STRIPE ' + Utilities.formatDate(validityEndDate, 'CET', 'dd.MM.yyyy'));

            }

        }
    } else {
        // logToSlack('No users found.', LOGGING_SOURCE_NAME);
        Logger.log("[MAIN]--- No users found");
    }

    sendSummaryEMail(error_accounts, expired_accounts, reminded_accounts);

}

