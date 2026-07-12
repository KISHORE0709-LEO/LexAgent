const pdf = require('pdf-parse');
const fs = require('fs');

async function go() {
  const data = await pdf.PDFParse(fs.readFileSync('architecture-a2-1782917064581.pdf'));
  console.log(data.text);
}
go().catch(console.error);
