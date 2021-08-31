import { Router, Request, Response } from "express";
import { prismaClient } from "./database/prismaClient";

import PDFPrinter from "pdfmake";
import { TableCell, TDocumentDefinitions } from "pdfmake/interfaces";

import fs from "fs";

const routes = Router();

routes.get("/products", async (request: Request, response: Response) => {
  const products = await prismaClient.products.findMany();
  return response.json(products);
});

routes.get("products/report", async (request: Request, response: Response) => {
  const products = await prismaClient.products.findMany();

  const fonts = {
    Helvetica: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };
  const printer = new PDFPrinter(fonts);

  const body = [];

  const columnsTitle: TableCell[] = [
    { text: "ID", style: "id" },
    { text: "Descrição", style: "columnsTitle" },
    { text: "Preço", style: "columnsTitle" },
    { text: "Quantidade", style: "columnsTitle" },
  ];

  const columnsBody = new Array();
  columnsTitle.forEach((column) => columnsBody.push(column));
  body.push(columnsBody);

  for await (let product of products) {
    const rows = new Array();
    rows.push(product.id);
    rows.push(product.description);
    rows.push(`R$ {product.price}`);
    rows.push(product.quantity);

    body.push(rows);
  }

  const docDefinitions: TDocumentDefinitions = {
    defaultStyle: { font: "Helvetica" },
    content: [
      {
        columns: [
          {
            text: "Relatórios de Produtos", // Titulo do pdf
            style: "header",
          },
          {
            text: "30/08/2021 11:00 \n\n", // Data e hora da geração do documento
            style: "header",
          },
        ],
      },
      {
        table: {
          heights: function (row) {
            return 30;
          },
          widths: [250, "auto", 50, "auto"],
          body,
        },
      },
    ],
    footer: [{text: "Copy Gabriel Martorelli", style: "footer"}], // Assinatura da tabela
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
      },
      columnsTitle: {
        fontSize: 13,
        bold: true,
        fillColor: "#7159c1",
        color: "#FFF",
        alignment: "center",
        margin: 4,
      },
      id: {
        fillColor: "#999",
        color: "#FFF",
        alignment: "center",
        margin: 4,
      },
      footer: {
        alignment: "center",
      },
    },
  };
  const pdfDoc = printer.createPdfKitDocument(docDefinitions);

  // pdfDoc.pipe(fs.createWriteStream("Relatorio.pdf"));

  const chunks = [];

  pdfDoc.on("data", (chunk) => {
    chunks.push(chunk);
  });

  pdfDoc.end();

  pdfDoc.on("end", () => {
    const result = Buffer.concat(chunks);
    response.end(result);
  });
});

export { routes };
