
/** This function updates cells with new values in a different sheet from 'active sheet' 
https://developers.google.com/sheets/api/guides/values 
cellRange = 'A1'
valueToUpdate = anything
spreadSheetId ='213jhfnn..'
inputOption = or 'USER_ENTERED' or 'RAW'
*/
function updateValue(cellRange, valueToUpdate, spreadSheetId, inputOption='USER_ENTERED'){
  var values = [
  [
  valueToUpdate
  ]
  // Additional rows ...
  ];
  var valueRange = Sheets.newValueRange();
  valueRange.values = values;
  
  return Sheets.Spreadsheets.Values.update(valueRange, spreadSheetId, cellRange, {
  valueInputOption: inputOption
  });
}


function strikethrough(spreadSheetId,sheetName="List of members", cellRange='A2:E2' ){
  var range= SpreadsheetApp.openById(spreadSheetId).getSheetByName(sheetName).getRange(cellRange);
  return range.setFontLine("line-through")
}



/**
 This functions changes the format of a date string from 18.09.2013 to 2013-09-18
 */
function reformatDateString(dateStr) {

  var LOGGING_PREFIX = 'reformatDateString';

  var elements = dateStr.split('/');
  if (elements.length !== 3) {
    Logger.log(LOGGING_PREFIX + 'Invalid date ' + String(dateStr) + '.');
    return;
  }

  elements = elements.reverse();

  return elements.join('-');
}


/**
 *  This function sends out an e-mail to the member primary (secondary email in cc) when the membership about to expire.
 * @param user: user object from the google admin directory
 * @param validityEndDate: Date Object
 * @param emailTemplateID: the email teplate document to be used as body of the email.
 */
function sendMembershipRenewalEMail(user, validityEndDate, emailTemplateID) {
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
  var content = makeStripeRenewalEMailContent(emailTemplateID, user.name.fullName, validityEndString);
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

/**This function find the row-index corresponding to a user by matching user's externalid in the 'Members' spreadsheet */
function findUserInMembersList(user, membersSpreadSheetId ){
  var userId = user.externalIds[0].value;
  var dataRange = 'List of members!A1:A'; // <SHEET_NAME>!<RANGE_START>:<RANGE_END>
  var membersIDs = Sheets.Spreadsheets.Values.get(membersSpreadSheetId, dataRange).values;
  //concatenate all the searched column values into one array
  var arrayOfIDs = membersIDs.reduce(function (a, b) {
    return a.concat(b);
  });
  //find the index of the user row by matching external ids
  var indexOfRow = arrayOfIDs.lastIndexOf(userId, -1)+1;
  return indexOfRow
}


/**
 * If the number of e-mails that can be send by the script drops below 20, the admins will be informed.
*/
function checkDailyEMailQuota() {

  var LOGGING_PREFIX = 'checkDailyEMailQuota';

  var emailQuotaRemaining = MailApp.getRemainingDailyQuota();
  Logger.log(LOGGING_PREFIX + 'Remaining email quota: ' + emailQuotaRemaining); // todo: remove after testing

  if (emailQuotaRemaining < 21) {
    MailApp.sendEmail(WARNINGS_ADDRESS, 'Warning E-Mail Quota Limit', 'The google app script "check for upcoming renewal" will soon reach its E-Mail quota limit!');
    // Todo: refactor this, so that the email addresses of membres that could not have an email send to will be logged and included in the message.
  }

}
