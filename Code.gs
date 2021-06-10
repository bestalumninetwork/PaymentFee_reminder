//Lisf of Email tamplates using IDs
const oneMonthBeforeEmailTemplate = "1UgxbOAh17WJDNu5S_bJLQuEyrsCtI-9rMNus8cUWj8g";
const oneWeekBeforeEmailTemplate = "1jqcRSXiPwr_QRb82ElMq1MzkMWzmAgTxEZTzTywPEAM";
// let dayofEnd = "1g2YztdUe-jlsb0Z-0ezZqXdmWVz_JiDsx3wq35a7-Qg";
const stripeoneWeekBeforeEmailTemplate = "17d_893dkwmyrCadQvVBaTxT8U_dnEX3nCgraE9rPkW8";
const membersSpreadSheetId = '1oc3GR89Mw5E78re_er_BXK7KWncrJX9oo4VxYVRCB6M'; // members spreadsheet
const WARNINGS_ADDRESS = 'miriam.mazzeo@bestalumni.net';//TODO change after testing
const ACTIVE_MEMBERS_ORG_UNIT = '/A1 - Current Members';
const secondWelcomeEmailTemplate = '1quITAdZW0v3ErbC1rz3P2n1Svq-vHlzBy8j51tOwc04';
const thirdWelcomeEmailTemplate = '1PZTnEy8RikiaWduoBR_nx1YtCOc7Eg6mWKJwA7EoiEs';


/**
 * Gets payment information from the MemberList spreadsheet, returns an array of all the rows.
 * @returns: members data from the MemberList spreadsheet as a list of rows
 * Source: https://developers.google.com/sheets/api/quickstart/apps-script
*/
function getMembersData() {

  var LOGGING_PREFIX = '[getMembersData] \t';

  Logger.log(LOGGING_PREFIX + 'started');

  //Url of the Membership spreadsheet (in future if spreadsheet changes, update only the url)
  //let url = "https://docs.google.com/spreadsheets/d/13YSSxKWzS8khlm_oMfDNcDCsW6SgVtjNJlA1q8zpoTI/edit#gid=0";
  //retrieve the id of the spreadsheet from the url
  //const membersSpreadSheetId = url.match("/spreadsheets/d/([a-zA-Z0-9-_]+)")[1];

  var dataRange = "'List of members'!A2:Y"; // <SHEET_NAME>!<RANGE_START>:<RANGE_END>
  var members = Sheets.Spreadsheets.Values.get(membersSpreadSheetId, dataRange).values;

  if (!members) {
      Logger.log(LOGGING_PREFIX + 'no payment data found in spreadsheet.') 
  }
  Logger.log(LOGGING_PREFIX + 'payment data retrieved from spreadsheet.');

  return members;
}



/**
  * This function checks which BAN member's accounts expire in one month
  * It is run periodically by a trigger.
*/
function mainfunc() {

  var LOGGING_PREFIX = '[main] ';

  Logger.log(LOGGING_PREFIX + 'Started');

  // Getting all payments from the google spreadsheet in tablearray
  var payments = getMembersData();

  /*
  Go through all users of the G Suite Directory
  Documentation on Admin Directory
  - quick start guide: https://developers.google.com/admin-sdk/directory/v1/quickstart/apps-script
  - developers guide:  https://developers.google.com/admin-sdk/directory/v1/guides/guides
  - api reference:     https://developers.google.com/admin-sdk/directory/v1/reference
  - code snippet:      https://developers.google.com/apps-script/advanced/admin-sdk-directory#list_all_users
  */
  //TODO what happened to the email quota parameter?

  //TODO TAKE USERS ONLY FROM A1
  var optionalArgs = {
    customer: 'my_customer',
    orderBy: 'email',
    query: "orgUnitPath='/A1 - Current Members'"
  };

  var response = AdminDirectory.Users.list(optionalArgs);
  var users = response.users;

  // check for every user if his account expires in the next month.
  var today = new Date();
  today.setHours(0,0,0,0); // at midnight

  var oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
  oneMonthFromNow.setHours(0,0,0,0); // at midnight

  var oneDayFromNow = new Date();
  oneDayFromNow.setDate(oneDayFromNow.getDate()+1);
  oneDayFromNow.setHours(0,0,0,0); // at midnight

  var oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate()+7);
  oneWeekFromNow.setHours(0,0,0,0); // at midnight
  

  var error_accounts = []; // List of accounts that can not be evaluated by the script for one reason or another
  var expired_accounts = []; // List of Users who's accounts have expired
  var reminded_accounts = []; // List of Users that have been reminded of their upcoming membership renewal

  //var ACTIVE_MEMBERS_ORG_UNIT = "/B1 - External people";
  //var INACTIVE_MEMBERS_ORG_UNIT = "/T1 - Test OU"; 
  var DEACTIVATED_MEMBERS_ORG_UNIT =  "/A3 - Deactivated members";
  var ACTIVE_MEMBERS_ORG_UNIT = '/A1 - Current Members';
  var INACTIVE_MEMBERS_ORG_UNIT = '/A2 - Members to be deactivated';

  if (users && users.length > 0) {
    Logger.log(LOGGING_PREFIX + users.length + ' users found.');
    for (let user of users) {

      //GET USER's CREATION DATE
      let userCreationDate = new Date(user.creationTime);
      //userCreationDate = new Date('20/05/2021')//TODO REMOVE AFTER TESTING
      userCreationDate.setHours(0,0,0,0); // at midnight
      let daysBetweenCreationAndToday = Math.abs(Math.ceil((userCreationDate.getTime() - today.getTime())/(1000 * 3600 * 24)));

      if (!userCreationDate || userCreationDate==-1) {
        Logger.log(LOGGING_PREFIX + 'No creation date found for user ' + user.name.fullName + ' [' + userId + '].');
        error_accounts.push(user.primaryEmail.toString());// add user email to errors count
        continue; 
        //The continue statement breaks one iteration (in the loop), if a condition occurs and continues with the next iteration in the loop.
      }

      //SEND SET OF EMAILS TO NEW USERS
      if (daysBetweenCreationAndToday<=21){
        if(daysBetweenCreationAndToday == 7){
          Logger.log(LOGGING_PREFIX + 'Date of user creation: ' + userCreationDate + '. The second WELCOME email template is being sent.');
          //email template 2 after 1 week since subscription
          sendMembershipRenewalEMail(user, validityEndDate, secondWelcomeEmailTemplate)
        }
        if (daysBetweenCreationAndToday == 21){
          Logger.log(LOGGING_PREFIX + 'Date of user creation: ' + userCreationDate + '. The third WELCOME email template is being sent.');
          //email template 3 after 3 weeks since subscription
          sendMembershipRenewalEMail(user, validityEndDate, thirdWelcomeEmailTemplate)
        }

      }


      //GET VALIDITY END DATE IN THE PAYMENTS SPREADSHEET
      try {
        var [validityEndDateStr, stripe] = getAccountValidityEndDate(user, payments);
      } catch(error){
        error_accounts.push(user.primaryEmail.toString());// add user email to errors count
        continue;
      }
      

      //TODO I donno if needed (Miriam)
      if(user.orgUnitPath =! ACTIVE_MEMBERS_ORG_UNIT){
        error_accounts.push(user.primaryEmail.toString());// add user email to errors count
        continue;
      }

      //CREATE DATE-VARIABLE FROM STRING OF VALIDITY END DATE (OR ACCOUNT'S EXPIRATION DATE) 
      let validityEndDate = new Date(reformatDateString(validityEndDateStr));
      validityEndDate.setHours(0,0,0,0); // set time at midnight

      // CHANGE FORMATTING OF validityEndDate FOR COMPARISON
      let formatedValidityDate1 = Utilities.formatDate(validityEndDate, 'CET', 'dd.MM.yyyy');
      let formatedValidityDate2 = Utilities.formatDate(validityEndDate, 'CET', 'yyyy-MM-dd');

      //CALCULATE NUMBER OF DAYS BETWEEN TODAY AND VALIDITY END DATE
      let daysBetweenTodayAndExpiring = Math.ceil((validityEndDate.getTime() - today.getTime())/(1000 * 3600 * 24));

      ////////////DEACTIVATE the account if the validity end date is in the past 
      
      if (validityEndDate.getTime() < today.getTime()&& user.orgUnitPath ==  ACTIVE_MEMBERS_ORG_UNIT ) {
        Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account is already expired on the: ' + formatedValidityDate2);

        //FIND INDEX ROW of the user in Members' spreadsheet by matching external ID 
        var indexOfRowInMembersList = findUserInMembersList(user, membersSpreadSheetId );
        
        //DEFINE DAYS OF BUFFER FOR DEACTIVATION AND INACTIVATION
        const deactivationBufferDays = 90;
        const inactivationBufferDays = 7;
        
        //DEACTIVATE USER IF EXPIRED SINCE MORE THAN 3 MONTHS (90 DAYS)
        if( -daysBetweenTodayAndExpiring >= deactivationBufferDays){
        Logger.log(LOGGING_PREFIX +"Validity end date set: "+validityEndDate + "and daysBetweenTodayAndExpiring: "+ daysBetweenTodayAndExpiring + ". Member is deactiveted.");
        user.orgUnitPath = DEACTIVATED_MEMBERS_ORG_UNIT;
        // update members spreadsheet, cellRange corresponds to column Q = 'Status' and the row corresponding to the used id
        updateValue( 'Q'+indexOfRowInMembersList, 'Excluded',membersSpreadSheetId);
        }

        //INACTIVATE USER IF EXPIRED SINCE MORE THAN A WEEK
        else if(-daysBetweenTodayAndExpiring >= inactivationBufferDays){
        Logger.log(LOGGING_PREFIX +"Validity end date set: "+validityEndDate + "and daysBetweenTodayAndExpiring: "+ daysBetweenTodayAndExpiring + ". Member is inactivated.");
        user.orgUnitPath = INACTIVE_MEMBERS_ORG_UNIT;

        // UPDATE MEMBERS' SPREADSHEET
        //update the cellRange corresponding to column Q = 'Status' and the row corresponding to the used id
        updateValue( 'Q'+indexOfRowInMembersList, 'Suspended',membersSpreadSheetId);

        // CROSS ROW IN MEMBERS' SPREADSHEET
        //https://developers.google.com/apps-script/reference/spreadsheet/range
        strikethrough(membersSpreadSheetId,sheetName="List of members", cellRange='A'+indexOfRowInMembersList+':U'+indexOfRowInMembersList )
        }

        //add member to list of expired accound 
        expired_accounts.push(user.primaryEmail.toString() + ' ' + formatedValidityDate1);

        AdminDirectory.Users.update(user,user.id); 
      } 

      ////////////SEND REMINDER if the validity end date is in a month or less from today

      else if (daysBetweenTodayAndExpiring<=31){

        // SEND REMINDER IF ACCOUNT EXPIRES IN 1 MONTH (NO STRIPE SUBSCRIPTION)
        if (formatedValidityDate2 == Utilities.formatDate(oneMonthFromNow, 'CET', 'yyyy-MM-dd')&& !stripe) {
          Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account will expire one month from now: ' + formatedValidityDate2+". A reminder has been sent."); // TODO: remove
          sendMembershipRenewalEMail(user, validityEndDate,oneMonthBeforeEmailTemplate);
          reminded_accounts.push(user.primaryEmail.toString() + ' ' + formatedValidityDate1);
        } 

        // SEND REMINDER IF ACCOUNT EXPIRES IN 1 WEEK (NO STRIPE SUBSCRIPTION)
        else if (formatedValidityDate2 == Utilities.formatDate(oneWeekFromNow, 'CET', 'yyyy-MM-dd') && !stripe) {
          Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account will expire tomorrow: ' + formatedValidityDate2+". A reminder has been sent."); // TODO: remove
          sendMembershipRenewalEMail(user, validityEndDate,oneWeekBeforeEmailTemplate);
          reminded_accounts.push(user.primaryEmail.toString() + ' ' + formatedValidityDate1);
        } 

        // SEND REMINDER IF ACCOUNT EXPIRES IN 1 WEEK AND GET RENEWED WITH STRIPE SUBSCRIPTION
        else if (formatedValidityDate2 == Utilities.formatDate(oneWeekFromNow, 'CET', 'yyyy-MM-dd')&& stripe) {
          Logger.log(LOGGING_PREFIX + user.primaryEmail + '´s account will be renewed by Stripe in one week: ' + formatedValidityDate2+". A reminder has been sent."); // TODO: remove 
          sendMembershipRenewalEMail(user, validityEndDate,stripeoneWeekBeforeEmailTemplate);
          reminded_accounts.push(user.primaryEmail.toString() + ' STRIPE ' + formatedValidityDate1);
        }
      }

    }
  } else 
  {
    Logger.log("[MAIN]--- No users found");
  }

  sendSummaryEMail(error_accounts, expired_accounts, reminded_accounts);
   
}

