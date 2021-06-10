/**
 * This method selects the Membership end date (column N or O for stripe) from the payments spreadsheet for a given user.
 * @param user: user object from the google admin directory
 * @param payments: payment data from the payments spreadsheet as a list of rows
 * @returns: date up to which the account is valid
*/
function getAccountValidityEndDate(user, members) {

  var LOGGING_PREFIX = '[getAccountValidityEndDate] ';
  // Logger.log(LOGGING_PREFIX + 'started');

  if (!members) {
    Logger.log(LOGGING_PREFIX + 'No payment data given!');
    return
  }
  if (!user) {
    Logger.log(LOGGING_PREFIX + 'No user given!');
    return
  }

  var validityEndDate = null;

  Logger.log(LOGGING_PREFIX + 'Looking for payment info of user: '+user.primaryEmail);

  try {
    var userId = user.externalIds[0].value; // User ID used to members the payments associated to this user
    //Logger.log(LOGGING_PREFIX+ "Found external id: " +userId);
  } catch (error) {
    Logger.log(LOGGING_PREFIX + 'Cannot get ID from user: ' + JSON.stringify(user));
    return false;
  }
  //TODO: TEST IT

  var stripe = false;
  let row;
  //NEW
  try {
    row = members.find((row) => row[0] == userId); //Match user with payment info

  } catch (error) {
    Logger.log(LOGGING_PREFIX + "Cannot find user ID in Members' list for user: " + JSON.stringify(user));
    return false;
  }
  //Logger.log(LOGGING_PREFIX+ "Found row in members' spreadsheet: "+row); //TODO remove after testing

  if (!userId || !row){
    MailApp.sendEmail(WARNINGS_ADDRESS, 'Warning', 'The user '+user.fullName+"doesn't have an external ID or is not present in Members' list");
    // ERROR IF ROW IS NOT FOUND
    //throw new Error(LOGGING_PREFIX +"ERROR: Cannot find user ID in directory or in Members' list");
    Logger.log(LOGGING_PREFIX +"ERROR: Cannot find user ID in Members' list for member: "+ user.primaryEmail);
    return false;
  }

    
  //column P is 'Last Payment Method' in 'List of members'
  if (row[15] === 'Stripe') {
    stripe = true;
  }
  //get membership's validity end date, column O is 'End of validity' in 'List of members'
  validityEndDate = row[14];  
  Logger.log(LOGGING_PREFIX+ "Found validity end date: "+validityEndDate+ ", and payment method: "+row[15])

  if (!validityEndDate || validityEndDate==-1) {
    throw new Error(LOGGING_PREFIX + 'No validity end date found for user ' + user.name.fullName + ' [' + userId + '].');
  }
    
  return [validityEndDate, stripe];
}