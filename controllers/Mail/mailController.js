// PROJECT_ROOT/controllers/mailController.js
const nodemailer = require("nodemailer");

// --- Centralized Transporter Creation ---
const createTransporter = () => {
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const tlsRejectUnauthorized = process.env.NODE_ENV === "production";

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: tlsRejectUnauthorized,
    },
  });
};

// --- HTML Template for Single User Welcome ---
const generateWelcomeEmailHTML = (name, email, password, loginUrl) => {
  return `
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Sorad Dynamics!</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background-color: #0056b3; color: #ffffff; padding: 30px 20px; text-align: center; } .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 25px; line-height: 1.6; } .content p { margin-bottom: 15px; }
        .credentials { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0056b3; margin: 20px 0; } .credentials strong { display: inline-block; width: 100px; }
        .button-container { text-align: center; margin-top: 30px; } .button { background-color: #28a745; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777777; background-color: #f0f0f0; } a { color: #0056b3; }
    </style></head><body><div class="container"><div class="header"><h1>Welcome to Sorad Dynamics!</h1></div>
    <div class="content"><p>Hello ${name},</p><p>Thank you for signing up! Your account is ready.</p>
    <div class="credentials"><p><strong>Email:</strong> ${email}</p><p><strong>Password:</strong> ${password}</p></div>
    <p><strong>Important:</strong> Please change your password after your first login.</p>
    ${
      loginUrl
        ? `<div class="button-container"><a href="${loginUrl}" class="button" style="color: #ffffff !important;">Login</a></div>`
        : ""
    }
    <p>Best regards,<br>The Sorad Dynamics Team</p></div>
    <div class="footer">© ${new Date().getFullYear()} Sorad Dynamics. All rights reserved.</div></div></body></html>`;
};

// --- Sending Function for Single User Welcome ---
const sendSignupWelcomeEmail = async (
  toEmail,
  name,
  password,
  loginUrl = null
) => {
  if (!toEmail || !name || !password) {
    console.error("sendSignupWelcomeEmail: Missing fields.");
    return { success: false, error: "Missing fields for welcome email." };
  }
  const transporter = createTransporter();
  const subject = "Welcome to Sorad Dynamics - Account Details";
  const htmlContent = generateWelcomeEmailHTML(
    name,
    toEmail,
    password,
    loginUrl || process.env.APP_LOGIN_URL
  );
  const textContent = htmlContent.replace(/<[^>]+>/g, ""); // Basic HTML to plain text

  try {
    const info = await transporter.sendMail({
      from: `"Sorad Dynamics" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html: htmlContent,
      text: textContent,
      replyTo: `<${process.env.SMTP_USER}>`,
      envelope: {
        from: `<${process.env.SMTP_USER}>`,
        to: toEmail,
      },
    });
    //console.log(`Welcome email sent to ${toEmail}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Failed to send welcome email to ${toEmail}:`, err);
    return {
      success: false,
      error: "Failed to send welcome email",
      details: err.message,
    };
  }
};

// --- HTML Template for Parent & Student Credentials ---
const generateParentStudentCredentialsEmailHTML = (
  parentName,
  parentCredentials,
  studentCredentials,
  loginUrl
) => {
  let parentInfoHtml = parentCredentials.password
    ? `<p><strong>Your Parent Account:</strong></p><div class="credentials"><p><strong>Email:</strong> ${parentCredentials.email}</p><p><strong>Password:</strong> ${parentCredentials.password}</p></div><p><em>Change this password after first login.</em></p>`
    : `<p>Your parent account email: <strong>${parentCredentials.email}</strong>. Your password remains unchanged.</p>`;
  return `
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Details - Sorad Dynamics</title><style>/* ... (similar styles as above) ... */
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background-color: #0056b3; color: #ffffff; padding: 30px 20px; text-align: center; } .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 25px; line-height: 1.6; } .content p { margin-bottom: 15px; }
        .credentials { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0056b3; margin: 20px 0; } .credentials strong { display: inline-block; min-width: 100px; }
        .section-title { font-size: 18px; font-weight: bold; color: #0056b3; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .button-container { text-align: center; margin-top: 30px; } .button { background-color: #28a745; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #777777; background-color: #f0f0f0; } a { color: #0056b3; }
    </style></head><body><div class="container"><div class="header"><h1>Welcome to Sorad Dynamics!</h1></div>
    <div class="content"><p>Hello ${parentName},</p><p>Accounts have been set up for you and your student, <strong>${
    studentCredentials.name
  }</strong>.</p>
    <div class="section-title">Parent Account</div>${parentInfoHtml}
    <div class="section-title">Student Account (${
      studentCredentials.name
    })</div>
    <div class="credentials"><p><strong>Email:</strong> ${
      studentCredentials.email
    }</p><p><strong>Password:</strong> ${studentCredentials.password}</p></div>
    <p><em>Student should change their password after first login.</em></p>
    ${
      loginUrl
        ? `<div class="button-container"><a href="${loginUrl}" class="button" style="color: #ffffff !important;">Login</a></div>`
        : ""
    }
    <p>Best regards,<br>The Sorad Dynamics Team</p></div>
    <div class="footer">© ${new Date().getFullYear()} Sorad Dynamics. All rights reserved.</div></div></body></html>`;
};

// --- Sending Function for Parent & Student Credentials ---
const sendParentStudentCredentialsEmail = async (
  toParentEmail,
  parentName,
  parentCredentials,
  studentCredentials,
  loginUrl = null
) => {
  if (
    !toParentEmail ||
    !parentName ||
    !parentCredentials ||
    !studentCredentials ||
    !studentCredentials.name ||
    !studentCredentials.email ||
    !studentCredentials.password ||
    !parentCredentials.email
  ) {
    console.error("sendParentStudentCredentialsEmail: Missing fields.");
    return { success: false, error: "Missing fields for credentials email." };
  }
  const transporter = createTransporter();
  const subject =
    "Important: Account Details for You and Student - Sorad Dynamics";
  const htmlContent = generateParentStudentCredentialsEmailHTML(
    parentName,
    parentCredentials,
    studentCredentials,
    loginUrl || process.env.APP_LOGIN_URL
  );
  try {
    const info = await transporter.sendMail({
      from: `"Sorad Dynamics" <${process.env.SMTP_USER}>`,
      to: toParentEmail,
      subject,
      html: htmlContent,
      replyTo: `<${process.env.SMTP_USER}>`,
    });
    // //console.log(
    //   `Parent-Student credentials email sent to ${toParentEmail}. ID: ${info.messageId}`
    // );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Failed to send credentials email to ${toParentEmail}:`, err);
    return {
      success: false,
      error: "Failed to send credentials email",
      details: err.message,
    };
  }
};

// --- Generic Email Sending Function (API Endpoint Handler) ---
const handleGenericSendEmail = async (req, res) => {
  const { to, subject, message, html } = req.body;
  if (!to || !subject || (!message && !html)) { 
    return res
      .status(400)
      .json({
        success: false,
        error: "Missing required fields: to, subject, and (message or html)",
      });
  }
  const transporter = createTransporter();
  try {
    const mailOptions = {
      from: `"Sorad Dynamics" <${process.env.SMTP_USER}>`,
      to,
      subject,
      replyTo: `<${process.env.SMTP_USER}>`,
      envelope: {
        from: `<${process.env.SMTP_USER}>`,
        to: to,
      },
    };
    if (html) {
      mailOptions.html = html;
      if (message) mailOptions.text = message;
    } else {
      mailOptions.text = message;
      mailOptions.html = `<p>${message.replace(/\n/g, "<br>")}</p>`;
    }
    const info = await transporter.sendMail(mailOptions);
    //console.log(`Generic email sent to ${to}. ID: ${info.messageId}`);
    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    });
  } catch (err) {
    console.error("Error sending generic email:", err);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to send email",
        details: err.message,
      });
  }
};

// --- Module Exports ---
module.exports = {
  sendSignupWelcomeEmail, // For StdUser signup
  sendParentStudentCredentialsEmail, // For Parent/Student signup
  handleGenericSendEmail, // For API endpoint in mailRoutes.js
};
