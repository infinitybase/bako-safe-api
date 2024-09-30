import cheerio from 'cheerio';
import fs from 'fs';
import handlebars from 'handlebars';
import nodemailer, { SendMailOptions } from 'nodemailer';
import path from 'path';

const {
  AWS_SMTP_USER,
  AWS_SMTP_PASS,
  EMAIL_FROM,
  UI_URL,
  AWS_SMTP_HOST,
  API_ENVIRONMENT,
} = process.env;
const isDevMode = API_ENVIRONMENT === 'development';
const YEAR = new Date().getFullYear();

const LOGO = 'https://besafe-asset.s3.amazonaws.com/BAKO_SAFE.png';

export interface EmailParams {
  [value: string]: unknown;
}

export interface EmailData extends SendMailOptions {
  data: EmailParams;
  to: string;
}

export enum EmailTemplateType {
  TRANSACTION_CREATED = 'transaction-created',
  TRANSACTION_COMPLETED = 'transaction-completed',
  TRANSACTION_DECLINED = 'transaction-declined',
  TRANSACTION_SIGNED = 'transaction-signed',
  VAULT_CREATED = 'vault-created',
}

const transporter = nodemailer.createTransport({
  host: AWS_SMTP_HOST,
  port: 587,
  ...(isDevMode ? {} : { secure: false }),
  auth: {
    user: AWS_SMTP_USER,
    pass: AWS_SMTP_PASS,
  },
});

export const renderTemplate = (
  templateName: EmailTemplateType,
  data: EmailParams,
) => {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(
      path.join(__dirname, '../templates/', `${templateName}.html`),
      (err, file) => {
        if (err) return reject(err);
        const compiledTemplate = handlebars.compile(file.toString());
        resolve(
          compiledTemplate({
            logo: LOGO,
            year: YEAR,
            bsafeUrl: UI_URL,
            ...data,
          }),
        );
      },
    );
  });
};

export const getSubject = (html: string) => {
  const $ = cheerio.load(html);
  const subject = $('title').text();
  return subject;
};

export const sendMail = async (
  templateName: EmailTemplateType,
  emailData: EmailData,
) => {
  const html = await renderTemplate(templateName, emailData.data);

  return transporter.sendMail({
    from: EMAIL_FROM,
    subject: getSubject(html),
    html,
    to: emailData.to,
  });
};
