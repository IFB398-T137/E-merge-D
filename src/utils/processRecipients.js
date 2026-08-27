// processRecipient func parses all email header fields of Recipients/email addresses into an array of valid objects (that can be passed into Graph API)

// checks the source of email addresses (either from csv file or manual entry) and then stores into array
export function processRecipientArrays({ 
    row, 
    csvHasCc, 
    csvHasBcc, 
    manualCc, 
    manualBcc 
}) {
    let ccArray = [];
    let bccArray = [];
    
    // runs if cc column exists in csv file OR if manual cc entries exists AND then stores into the array
    if (csvHasCc) {     // source is uploaded csv file
        const ccKey = row ? Object.keys(row).find(key => key.trim().toLowerCase() === "cc") : null;
        const ccRaw = ccKey && row[ccKey] ? row[ccKey] : "";
        ccArray = parseEmailCell(ccRaw);

        // ----- return ccArray;
        
        //ccArray = findCsvCcRaw ? findCsvCcRaw.split(","). map(event => event.trim()).filter(Boolean) : [];

        //ccArray = parseEmailCell(findCsvCcRaw);

        //ccArray =  (row && (row?.CC || row?.cc || row?.CC)) || "";
        //cc = parseEmailCell(ccArray);

        // -------------------
        /*
        let rowCc = manualCc;
        const csvCcKey = row ? Object.keys(row).find(k => k.trim().toLowerCase() === "cc") : null;
        const csvCcRaw = csvCcKey && row[csvCcKey] ? row[csvCcKey] : "";
        rowCc = csvCcRaw ? csvCcRaw.split(",").map(e => e.trim()).filter(Boolean) : [];
        */
       
       //const csvCcArray = (row && (row.CC || row.Cc || row.cc)) || "";
       //ccArray = csvCcArray ? parseEmailCell(csvCcArray) : [];

    } else if (manualCc) {  // source is manual cc entry 
        ccArray = parseEmailCell(manualCc);
        
        //const ccRaw = manualCc.split(",").map(event => event.trim()).filter(Boolean);
        //ccArray = parseEmailCell(ccRaw)

        // ----- return ccArray;

    }

    // runs same as above for bcc column
    if (csvHasBcc) {        //source is uploaded csv file
        const bccKey = row ? Object.keys(row).find(key => key.trim().toLowerCase() === "bcc") : null;
        const bccRaw = bccKey && row[bccKey] ? row[bccKey] : "";
        bccArray = parseEmailCell(bccRaw);

        // ------ return bccArray;

        //const findCsvBccKey = row ? Object.keys(row).find(k => k.trim().toLowerCase() === "bcc") : null;
        //const findCsvBccRaw = findCsvBccKey && row[findCsvBccKey] ? row[findCsvBccKey] : "";
        
        //bccArray = parseEmailCell(findCsvBccRaw);

        //ccArray =  (row && (row?.CC || row?.cc || row?.CC)) || "";
        //cc = parseEmailCell(ccArray);

    } else if (manualBcc) {     //source is manual entry
        bccArray = parseEmailCell(manualBcc)
        
        //const bccRaw = manualBcc.split(",").map(event => event.trim()).filter(Boolean);
        //bccArray = parseEmailCell(bccRaw)

        //----- return bccArray;
    /*
    // uses cc - from csv columns if hasCc, otherwise from manual entry
    let rowCc = manualCc;
    if (!csvHasCc) {
      const csvCcKey = row ? Object.keys(row).find(k => k.trim().toLowerCase() === "cc", "Cc", "CC") : null;
      const csvCcRaw = csvCcKey && row[csvCcKey] ? row[csvCcKey] : "";
      rowCc = csvCcRaw ? csvCcRaw.split(",").map(e => e.trim()).filter(Boolean) : [];
    }

    // uses bcc — from csv columns if hasBcc, otherwise use manual entry
    let rowBcc = manualBcc
    if (csvHasBcc) {
      const csvBccKey = row ? Object.keys(row).find(k => k.trim().toLowerCase() === "bcc") : null;
      const csvBccRaw = csvBccKey && row[csvBccKey] ? row[csvBccKey] : "";
      rowBcc = csvBccRaw ? csvBccRaw.split(",").map(e => e.trim()).filter(Boolean) : [];
    }

    const csvCcEmails = rowCc.length > 0 rowCc : manualCc;
    */

    } 

    return { 
        cc: ccArray, 
        bcc: bccArray }
}

// handling if multiple email addresses in the 1 cell by separating by comma into an array of trimmed and valid email addresses
export function parseEmailCell(value) {
    if (!value || typeof value !== 'string') return []
    //return value.split(',').map(email => email.trim()).filter(email => email.length > 0).filter(email => validateEmail(email))
    return value.split(',').map(email => email.trim()).filter(email => email.length > 0 && validateEmail(email));
} //add catch?

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
} //add catch for invalid email addresses
