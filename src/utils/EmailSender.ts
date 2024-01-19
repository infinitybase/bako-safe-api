import cheerio from 'cheerio';
import fs from 'fs';
import handlebars from 'handlebars';
import nodemailer, { SendMailOptions } from 'nodemailer';
import path from 'path';

const { AWS_SMTP_USER, AWS_SMTP_PASS, EMAIL_FROM, UI_URL } = process.env;
const YEAR = new Date().getFullYear();

// const LOGO = `<svg
// width="93"
// height="34"
// viewBox="0 0 93 34"
// fill="none"
// xmlns="http://www.w3.org/2000/svg"
// >
// <g clip-path="url(#clip0_1734_7564)">
//   <path
//     fill-rule="evenodd"
//     clip-rule="evenodd"
//     d="M26.724 13.5426C27.2977 12.5653 27.7491 11.5269 28.0474 10.4511C29.6478 4.67851 26.2534 0 20.466 0C20.4193 0 20.3719 0.0023371 20.3253 0.00301859L20.326 0H15.3135C13.7942 0 12.5197 0.947559 12.1249 2.37206L10.5474 8.12177H17.8427L17.8419 8.12255C17.8542 8.12255 17.8657 8.12177 17.878 8.12177C19.3445 8.12177 20.2044 9.30737 19.7989 10.7693C19.3927 12.2318 17.8764 13.4167 16.4098 13.4167C16.3976 13.4167 16.3861 13.416 16.3747 13.416V13.4167H9.07858L10.5467 8.12177H6.09115C4.57104 8.12177 3.29727 9.07011 2.90251 10.4938L0 20.9022H19.4615H19.4608C19.473 20.9022 19.4853 20.9022 19.4967 20.9022C20.9632 20.9022 21.8232 22.087 21.4177 23.5489C21.0122 25.0115 19.4952 26.1964 18.0287 26.1964C18.0172 26.1964 18.0057 26.1956 17.9934 26.1956V26.1964H8.04963C6.53028 26.1964 5.25574 27.1447 4.86098 28.5692L3.35541 34H17.8863L17.8871 33.9969C17.9337 33.9977 17.9789 34 18.0263 34C23.8138 34 29.8024 29.3215 31.4028 23.5489C32.7118 18.8269 30.6769 14.8381 26.724 13.5426Z"
//     fill="black"
//   />
//   <path
//     fill-rule="evenodd"
//     clip-rule="evenodd"
//     d="M58.5112 27.3431C58.2774 28.6808 57.1223 29.6553 55.7711 29.6553H55.2846L55.2869 29.6435C53.9027 29.5837 53.4373 28.7375 53.6972 27.2426C53.7598 26.8794 53.8815 25.3129 55.7971 25.3129H58.8656C58.7427 26.0128 58.6211 26.7148 58.5112 27.3431ZM64.7177 19.8669C65.3307 16.3516 64.0882 14.4219 60.5579 14.4219H53.7278C52.3932 14.4219 51.2463 15.3727 50.9936 16.6903L50.5496 19.0164H58.6611C59.2151 19.0164 59.6013 19.4277 59.5812 19.9641C59.5801 20.0153 59.5304 20.3797 59.508 20.4631C59.3946 20.9001 58.9978 21.2227 58.5277 21.2227H54.1944C51.6586 21.2227 49.5339 22.8019 49.0933 25.3129L48.5311 28.5526C47.9228 32.0679 49.1618 33.9976 52.6932 33.9976H57.4907C61.8028 33.9976 62.659 31.6971 63.1338 28.9682L63.9618 24.2092C63.9618 24.2092 64.433 21.5017 64.7177 19.8669Z"
//     fill="black"
//   />
//   <path
//     fill-rule="evenodd"
//     clip-rule="evenodd"
//     d="M40.8537 19.0164H40.8702H48.1688L48.5923 16.6999C48.8071 15.4476 47.9434 14.4219 46.6728 14.4219H40.0931C34.242 14.4219 33.7117 19.0505 34.3547 21.2762C34.4769 21.7025 34.9562 22.3382 35.1827 22.5444L39.5866 27.5664C40.4764 28.5301 40.4609 29.4779 39.1583 29.4779H33.9857C33.1671 29.4779 32.4683 30.0677 32.3307 30.8754L31.7969 33.9976H41.257C43.8753 33.9976 45.5006 32.7688 46.5032 30.806C46.7215 30.3797 47.2921 28.1113 45.9812 26.6838L40.3447 20.5443C39.7728 20.0314 40.086 19.027 40.8537 19.0164Z"
//     fill="black"
//   />
//   <path
//     fill-rule="evenodd"
//     clip-rule="evenodd"
//     d="M87.1709 21.1764C87.1072 21.5396 86.9867 23.106 85.0709 23.106H82.0023C82.124 22.4062 82.2469 21.7043 82.3567 21.076C82.5894 19.7383 83.7457 18.7639 85.0957 18.7639H85.5835L85.5812 18.7756C86.9654 18.8365 87.4308 19.6828 87.1709 21.1764ZM88.1749 14.4219H83.3784C79.065 14.4219 78.2087 16.7233 77.7339 19.4499L76.906 24.2097C76.906 24.2097 76.4335 26.9182 76.15 28.5518C75.537 32.067 76.7795 33.9976 80.3099 33.9976H87.1404C88.475 33.9976 89.6218 33.0445 89.8746 31.7283L90.3175 29.4033H82.2068C81.6528 29.4033 81.2666 28.9909 81.2867 28.4546C81.2878 28.4043 81.3375 28.039 81.3587 27.9567C81.4733 27.5186 81.8702 27.196 82.3402 27.196H86.6726C89.2096 27.196 91.3345 25.6169 91.7762 23.1061L92.3361 19.8666C92.9456 16.3515 91.7065 14.4219 88.1749 14.4219Z"
//     fill="black"
//   />
//   <path
//     fill-rule="evenodd"
//     clip-rule="evenodd"
//     d="M74.7205 15.03L75.1415 12.8597H77.502L78.3524 7.55469H78.3161H78.0443H76.3734H76.3649C73.2254 7.55469 70.54 9.8292 69.9986 12.9455L69.6907 14.9957C68.399 14.9957 67.294 15.9309 67.0724 17.2132L66.7111 19.2429H68.9458L66.3828 33.9991H69.0736C70.4292 33.9991 71.5897 33.0165 71.823 31.6709L73.9991 18.5445L74.7205 15.03Z"
//     fill="black"
//   />
//   <mask
//     id="mask0_1734_7564"
//     style="mask-type: alpha"
//     maskUnits="userSpaceOnUse"
//     x="61"
//     y="0"
//     width="17"
//     height="27"
//   >
//     <path
//       fill-rule="evenodd"
//       clip-rule="evenodd"
//       d="M68.6953 18.9691L68.2743 21.1395H65.9139L65.0635 26.4444H65.0998H65.3715H67.0425H67.0509C70.1904 26.4444 72.8758 24.1699 73.4172 21.0535L73.7251 19.0035C75.0168 19.0035 76.1218 18.0681 76.3435 16.7859L76.7047 14.7563H74.4701L77.033 0H74.3422C72.9867 0 71.8261 0.982608 71.5928 2.32816L69.4167 14.8604H65.2915L63.639 16.7859L61.9219 18.9691H68.6953Z"
//       fill="#1CF593"
//     />
//   </mask>
//   <g mask="url(#mask0_1734_7564)">
//     <path
//       d="M74.4603 14.7656L73.7734 19.0585L76.5209 19.9172L76.8644 14.7656H74.4603Z"
//       fill="black"
//     />
//   </g>
// </g>
// <defs>
//   <clipPath id="clip0_1734_7564">
//     <rect width="92.4876" height="34" fill="white" />
//   </clipPath>
// </defs>
// </svg>`;

const LOGO = 'https://app.bsafe.pro/assets/logo-294a5e40.svg';

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
  host: 'email-smtp.sa-east-1.amazonaws.com',
  port: 587,
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
