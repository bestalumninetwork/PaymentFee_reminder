/**
function strikethrough() {
  //var ss = SpreadsheetApp.getActiveSpreadsheet(); // Get the current spreadsheet.
  //var sheet = ss.getSheets()[0];                  // Select the first sheet.
  //var cell = sheet.getRange(range);               // Use supplied arguments
  //cell.setFontLine("line-through");                     // set strikethrough
  var params = {
    // The spreadsheet to apply the updates to.
    spreadsheetId: '1oc3GR89Mw5E78re_er_BXK7KWncrJX9oo4VxYVRCB6M',  // TODO: Update placeholder value.
  };

  var batchUpdateSpreadsheetRequestBody = {
    // A list of updates to apply to the spreadsheet.
    // Requests will be applied in the order they are specified.
    // If any request is not valid, no requests will be applied.
    requests: [],  // TODO: Update placeholder value.

    // TODO: Add desired properties to the request body.
  };

  var request = Sheets.Spreadsheets.batchUpdate(params, batchUpdateSpreadsheetRequestBody);

  var data = [
  { 
    range: "Sheet1!A1",   // Update single cell
    values: [ ["A1"]]
  },
  {
    range: "Sheet1!B1:B3", // Update a column
    values: [["B1"],["B2"],["B3"]]
  },
  {
    range: "Sheet1!C1:E1", // Update a row
    values: [ ["A1", "B1", "C1","D1","E1", ] ]
  }
  {
    range: "Sheet1!F1:H2", // Update a 2d range
    values: [["F1", "F2"],["H1", "H2"]]
    }
  ];
  

  var resource = {
    spreadsheetId: spreadsheetId,
    auth: auth,
    resource: { data: data, valueInputOption: "USER_ENTERED" }
  };

  Sheets.Spreadsheets.Values.batchUpdate(resource);

}
*/
//var valueToUpdate = Sheets.Spreadsheets.Values.get(spreadSheetId, 'A2:E2'); //return right value in brackets [[]]




/*
function tryUpdate(cellRange='A2:E2', valueToUpdate, spreadSheetId, inputOption='USER_ENTERED'){
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
*/
function testDate(){

  var today = new Date();
  today.setHours(0,0,0,0); // last midnight
  Logger.log(today);
  Logger.log(today.getTime());
  var past = new Date();
  past.setMonth(past.getMonth()-2);
  past.setHours(0,0,0,0); 
  Logger.log(past);
  var time = Math.abs(today.getTime()-past.getTime());
  Logger.log(Math.ceil(time/ (1000 * 3600 * 24)));

}

function testCreationDate(){
 let user = AdminDirectory.Users.get('aatest1.2405@bestalumni.net')
 Logger.log(user.creationTime)
}



function testUserField(email = 'aatest1.2405@bestalumni.net'){
  //var today = new Date();
  //today.setHours(0,0,0,0); // last midnight
  let user = AdminDirectory.Users.get(email)
  //Logger.log(user)
  //let date = new Date(user.creationTime)
  //date.setHours(0,0,0,0); 
  //Logger.log(date)
  //var time = date.getTime()-today.getTime();
  //Logger.log(user.notes);
  //user.notes = 'bla';
  //AdminDirectory.Users.update(user,user.id); 
  var userPrimaryEmail = email;
  var passwordValue = '55555';
  Logger.log(user)

  // If user has no 'externalIds' field add a 'externalIds' empty list to the user resource
  if (user.externalIds){
  user.externalIds = [];
  }

  user.externalIds.push(
    {
      value: 10,
      type : "organization"
    }
  )
/*
  if (! user.password){
  user.password = [];
  }

  user.password.push(
    5555
  )
  if ( user.organizations){
  user.organizations =[] ;
  }

  user.organizations.push(
    {
      costCenter: 'bla',
      title:'Member', 
      customType:'', 
      description:'Volunteer', 
      primary:true
    }
  )
  */

  AdminDirectory.Users.update(user,email); 

  Logger.log(user)

 /*
  var resource = {
  externalIds: [
    {
      value: 888888,
      type : "network"
    }
    
  ]
  }
  AdminDirectory.Users.update( resource, email);
  AdminDirectory.Users.patch(resource, email);
  */

  return  

}

function testUserUpdate(email = 'aatest1.2405@bestalumni.net'){
  let user = AdminDirectory.Users.get(email)
  //retrieve cost center: 
  Logger.log(user.organizations[0].costCenter)
  return  Logger.log(user.externalIds)

}

//update phone works: https://stackoverflow.com/questions/23364870/update-phone-number-on-google-apps-user


