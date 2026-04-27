import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const [, , command, inputPath, outputDir] = process.argv;

if (!command || !inputPath) {
  console.error("Usage: node excel_record_changes.mjs <inspect|update> <inputPath> [outputDir]");
  process.exit(1);
}

async function loadWorkbook(xlsxPath) {
  const input = await FileBlob.load(xlsxPath);
  return SpreadsheetFile.importXlsx(input);
}

function listWorksheetNames(workbook) {
  const names = [];
  const worksheets = workbook.worksheets;

  if (typeof worksheets.getSheetCount === "function" && typeof worksheets.getSheetNameByIndex === "function") {
    const count = worksheets.getSheetCount();
    for (let index = 0; index < count; index += 1) {
      names.push(worksheets.getSheetNameByIndex(index));
    }
    return names.filter(Boolean);
  }

  if (Array.isArray(worksheets?.items)) {
    return worksheets.items.map((sheet) => sheet.name).filter(Boolean);
  }

  return [];
}

async function inspectWorkbook(xlsxPath) {
  const workbook = await loadWorkbook(xlsxPath);
  const sheetNames = listWorksheetNames(workbook);
  console.log(JSON.stringify({ sheetNames }, null, 2));
}

await inspectWorkbook(inputPath);
