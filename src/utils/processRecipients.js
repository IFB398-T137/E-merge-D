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

    } else if (manualCc) {  // source is manual cc entry 
        ccArray = parseEmailCell(manualCc);
    }

    // runs same as above for bcc column
    if (csvHasBcc) {        //source is uploaded csv file
        const bccKey = row ? Object.keys(row).find(key => key.trim().toLowerCase() === "bcc") : null;
        const bccRaw = bccKey && row[bccKey] ? row[bccKey] : "";
        bccArray = parseEmailCell(bccRaw);

    } else if (manualBcc) {     //source is manual entry
        bccArray = parseEmailCell(manualBcc)
    } 

    return { 
        cc: ccArray, 
        bcc: bccArray }
}
// handling if multiple email addresses in the 1 cell by separating by comma into an array of trimmed and valid email addresses
export function parseEmailCell(value) {
    if (!value || typeof value !== 'string') return []
    return value.split(',').map(email => email.trim()).filter(email => email.length > 0 && validateEmail(email));
} //add catch?

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
} //add catch for invalid email addresses
