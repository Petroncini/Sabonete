// Utilitário para gerar o Payload do PIX (BR Code / EMV)
// Implementação baseada nas especificações do Banco Central do Brasil

function formatLength(str) {
    return str.length.toString().padStart(2, '0');
}

function calculateCRC16(payload) {
    let polynomial = 0x1021;
    let crc = 0xFFFF;

    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(key, merchantName, merchantCity, txid, amount) {
    // 00 - Payload Format Indicator
    let payload = "000201";
    
    // 26 - Merchant Account Information
    let gui = "0014BR.GOV.BCB.PIX";
    let keyStr = `01${formatLength(key)}${key}`;
    let accountInfo = `${gui}${keyStr}`;
    payload += `26${formatLength(accountInfo)}${accountInfo}`;
    
    // 52 - Merchant Category Code
    payload += "52040000";
    
    // 53 - Transaction Currency (BRL)
    payload += "5303986";
    
    // 54 - Transaction Amount
    let amountStr = amount.toFixed(2);
    payload += `54${formatLength(amountStr)}${amountStr}`;
    
    // 58 - Country Code
    payload += "5802BR";
    
    // 59 - Merchant Name
    let formattedName = merchantName.substring(0, 25).toUpperCase();
    payload += `59${formatLength(formattedName)}${formattedName}`;
    
    // 60 - Merchant City
    let formattedCity = merchantCity.substring(0, 15).toUpperCase();
    payload += `60${formatLength(formattedCity)}${formattedCity}`;
    
    // 62 - Additional Data Field Template (TXID)
    let formattedTxid = txid.substring(0, 25).toUpperCase();
    let additionalData = `05${formatLength(formattedTxid)}${formattedTxid}`;
    payload += `62${formatLength(additionalData)}${additionalData}`;
    
    // 63 - CRC16
    payload += "6304";
    let crc = calculateCRC16(payload);
    payload += crc;
    
    return payload;
}

module.exports = { generatePixPayload };
