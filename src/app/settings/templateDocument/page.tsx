"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import AdminLayout from "@/app/(admin)/layout";
import {
  FileCode2, Eye, X as XIcon, Copy, Download, Save,
  Undo2, Redo2, Trash2, Search, Plus, ChevronDown, Upload
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/* =========================================================
   Server API helpers (all via fetchWithAuth)
   ========================================================= */
const API_BASE = getEnv("NEXT_PUBLIC_API_URL") ?? "http://localhost:8080";
const API = `${API_BASE}/api/template-documents`;

// map UI context <-> backend enum
const toServerContext = (c: "encounter" | "portal") => c.toUpperCase();
const fromServerContext = (c: string): "encounter" | "portal" =>
  c.toLowerCase() === "encounter" ? "encounter" : "portal";

type UpsertBody = {
  name: string;
  context: string;
  content: string;
  options: {
    theme: TemplateTheme;
    container: TemplateContainer;
    card: boolean;
    applyWrapperToFullHTML: boolean;
  };
};

type ServerTemplate = {
  id: number;
  name: string;
  context: string;
  content: string;
  options: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

async function apiCreateTemplate(body: UpsertBody): Promise<ServerTemplate> {
  const res = await fetchWithAuth(`${API}`, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data || json;
}
async function apiUpdateTemplate(id: number, body: UpsertBody): Promise<ServerTemplate> {
  const res = await fetchWithAuth(`${API}/${id}`, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data || json;
}
async function apiGetTemplate(id: number): Promise<ServerTemplate> {
  const res = await fetchWithAuth(`${API}/${id}`, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data || json;
}
async function apiListTemplates(context?: string): Promise<ServerTemplate[]> {
  const url = context ? `${API}?context=${context}` : `${API}`;
  const res = await fetchWithAuth(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.data || json;
}
async function apiDeleteTemplate(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

/* =========================================================
   Types & constants
   ========================================================= */
type TemplateTheme = "slate" | "stone" | "neutral" | "zinc";
type TemplateContainer = "narrow" | "normal" | "wide";
type TemplateContext = "encounter" | "portal";

interface TemplateOptions {
  theme: TemplateTheme;
  container: TemplateContainer;
  card: boolean;
  applyWrapperToFullHTML: boolean;
  context: TemplateContext; // Encounter/Portal
}

interface SavedTemplate {
  id: string;
  name: string;
  content: string;
  options: TemplateOptions;
  updatedAt: number;
}
type Snap = { title: string; templateText: string; tplOptions: TemplateOptions; currentId: string | null };

const LS_DRAFT = "ts_current_draft_v6";

// Unified design tokens with added depth
const btn =
  "inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 hover:shadow-md hover:from-blue-50 hover:to-white active:scale-[.97] transition text-sm font-medium shadow-sm backdrop-blur-sm";
const pillSm =
  "inline-flex items-center gap-1.5 px-2 py-1 rounded-xl border border-gray-200 bg-white/80 hover:bg-blue-50 text-[11px] leading-none font-semibold shadow-sm";
const card = "bg-white/85 rounded-3xl border border-gray-200 shadow-[0_4px_14px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.06)] backdrop-blur-sm hover:shadow-[0_10px_32px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.10)] transition";
const inputBase =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium";

const uid = () => Math.random().toString(36).slice(2);
const isLikelyHTML = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);
const isFullHTMLDocument = (s: string) => /<!doctype html/i.test(s) || /<html[\s\S]*?>/i.test(s);

/* =========================================================
   Your 4 default templates (content preserved)
   ========================================================= */
const TEMPLATE_HIPAA = `HIPAA Declaration
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HIPAA Declaration - Ciyex Practice</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 2em;
      background: #f8f9fa;
      color: #222;
    }
    .container {
      max-width: 800px;
      margin: auto;
      background: #fff;
      padding: 2em;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    h1 {
      text-align: center;
      color: #2d5c9f;
    }
    .section-title {
      margin-top: 1.5em;
      font-weight: bold;
      color: #2d5c9f;
    }
    ul, ol {
      margin-left: 1.5em;
      margin-bottom: 1em;
    }
    label {
      font-weight: bold;
    }
    .input-row {
      margin-bottom: 1em;
    }
    .signature-row {
      display: flex;
      gap: 2em;
      align-items: center;
      margin-bottom: 2em;
    }
    .refusal-row {
      margin-top: 1.5em;
      background: #ffe9e9;
      padding: 1em;
      border-radius: 6px;
      border: 1px solid #e6b7b7;
    }
    .checkbox-group {
      display: flex;
      gap: 1em;
      align-items: center;
    }
    .note {
      font-size: 0.95em;
      color: #555;
      margin-top: 0.5em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>HIPAA Declaration & Privacy Notice</h1>
    <p>
      <strong>Date of Service:</strong>
    </p>
    <div class="section-title">Privacy Notice</div>
    <ol>
      <li>
        The Practice is required by federal law to maintain the privacy of your Protected Health Information (PHI) and to provide you with this Privacy Notice detailing the Practice's legal duties and privacy practices with respect to your PHI.
      </li>
      <li>
        Under the Privacy Rule, other laws may require greater access or restrictions on the use or release of your PHI than provided for under federal HIPAA laws.
      </li>
      <li>
        The Practice is required to abide by the terms of this Privacy Notice.
      </li>
      <li>
        The Practice reserves the right to change the terms of this Privacy Notice and make new provisions effective for all PHI it maintains.
      </li>
      <li>
        Any revised Privacy Notice will be distributed to you prior to implementation.
      </li>
      <li>
        The Practice will not retaliate against you for filing a complaint.
      </li>
    </ol>

    <div class="section-title">Patient Communications</div>
    <p>
      In accordance with the Health Insurance Privacy Act 1996 (USA), we inform you of the following government stipulations for contacting you with educational and promotional items in the future via e-mail, U.S. mail, telephone, and/or prerecorded messages. We will not share, sell, or use your personal contact information for spam messages.
    </p>

    <div class="section-title">Digital Information Protection</div>
    <ul>
      <li>Practice User accounts require a password to access patient databases.</li>
      <li>Users must log out or exit any medical information when not in use or after a default timeout.</li>
      <li>When registering medical information in front of patients, use the "Privacy" feature to hide PHI for other patients in the Search screen.</li>
      <li>Standard operating procedures require documentation of any Export of Patient Medical or other information.</li>
      <li>Medical information may only be stored on a laptop or portable media outside the Practice if recorded in writing and must be erased when no longer needed. Information should be encrypted when transported outside the Practice.</li>
      <li>Only authorized technicians may occasionally access hardware and software. A signed Business Associate Contract is required before granting access, and technicians are trained on HIPAA regulations to limit use and disclosure of customer data to the minimum necessary.</li>
    </ul>
    <p>
      <strong>I acknowledge receipt of this notice, have read and understand its contents.</strong>
    </p>

    <form>
      <div class="section-title">Patient Information</div>
      <div class="input-row">
        <label for="patientName">Patient Name:</label>
        <input type="text" id="patientName" name="patientName" required>
      </div>
      <div class="input-row">
        <label for="patientSex">Sex:</label>
        <input type="text" id="patientSex" name="patientSex">
      </div>
      <div class="input-row">
        <label for="patientID">External ID:</label>
        <input type="text" id="patientID" name="patientID">
      </div>
      <div class="input-row">
        <label for="patientDOB">Date of Birth:</label>
        <input type="date" id="patientDOB" name="patientDOB">
      </div>
      <div class="input-row">
        <label for="address">Home Address:</label>
        <input type="text" id="address" name="address">
      </div>
      <div class="input-row">
        <label for="zip">Zip:</label>
        <input type="text" id="zip" name="zip">
      </div>
      <div class="input-row">
        <label for="city">City:</label>
        <input type="text" id="city" name="city">
      </div>
      <div class="input-row">
        <label for="state">State:</label>
        <input type="text" id="state" name="state">
      </div>
      <div class="input-row">
        <label for="patientPhone">Home Phone:</label>
        <input type="tel" id="patientPhone" name="patientPhone">
      </div>
      <div class="signature-row">
        <label for="patientSignature">Patient Signature:</label>

  <div class="sig-pad my-1">
    <canvas id="sig_bx3p0aeu1bg" class="w-full h-28 rounded-md border border-dashed border-gray-300 bg-white"></canvas>
    <div class="flex justify-end gap-2 mt-2">
      <button type="button" class="sig-clear px-3 py-1.5 rounded border text-sm">Clear</button>
    </div>
    <input type="hidden" name="signature_bx3p0aeu1bg" />
  </div>
        <label for="dos">Date:</label>
        <input type="date" id="dos" name="dos">
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="acceptTerms" name="acceptTerms" checked>
        <label for="acceptTerms">I accept these terms</label>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="refuseTerms" name="refuseTerms">
        <label for="refuseTerms">I do not accept these terms</label>
      </div>
      <div class="refusal-row">
        <label for="refusalReason">Patient refusal to sign due to the following reason:</label>
        <input type="text" id="refusalReason" name="refusalReason" style="width:90%;">
      </div>
      <button type="submit" style="margin-top:1.5em; padding:0.6em 1.2em; background:#2d5c9f; color:#fff; border:none; border-radius:4px; font-size:1em;">Submit</button>
    </form>
    <div class="note">
      Please contact our office if you have any questions or concerns about this notice or your privacy rights.
    </div>
  </div>
<script>(function signatureInit() {
    document.querySelectorAll('.sig-pad').forEach((wrapper)=>{
        var _wrapper_querySelector;
        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return;
        const hidden = wrapper.querySelector('input[type="hidden"]');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let drawing = false;
        let lastX = 0, lastY = 0;
        function size() {
            if (!canvas || !ctx) return; // Guards to satisfy strict null checks
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const rect = canvas.getBoundingClientRect();
            canvas.width = Math.max(1, rect.width * ratio);
            canvas.height = Math.max(1, rect.height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#111827';
        }
        size();
        window.addEventListener('resize', size);
        const pos = (e)=>{
            const r = canvas.getBoundingClientRect();
            const point = e.touches ? e.touches[0] : e;
            return {
                x: point.clientX - r.left,
                y: point.clientY - r.top
            };
        };
        const down = (e)=>{
            drawing = true;
            const { x, y } = pos(e);
            lastX = x;
            lastY = y;
        };
        const move = (e)=>{
            if (!drawing) return;
            e.preventDefault();
            const { x, y } = pos(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            lastX = x;
            lastY = y;
            if (hidden) hidden.value = canvas.toDataURL('image/png');
        };
        const up = ()=>{
            drawing = false;
        };
        canvas.addEventListener('mousedown', down);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        canvas.addEventListener('touchstart', down, {
            passive: false
        });
        canvas.addEventListener('touchmove', move, {
            passive: false
        });
        window.addEventListener('touchend', up);
        (_wrapper_querySelector = wrapper.querySelector('.sig-clear')) === null || _wrapper_querySelector === void 0 ? void 0 : _wrapper_querySelector.addEventListener('click', ()=>{
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (hidden) hidden.value = '';
        });
    });
})();</script></body>
</html>`;

const TEMPLATE_HELP = `Instructions for completing Pending Forms
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Instructions for Completing Pending Forms</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      background: #f4f6fb;
      color: #222;
      font-size: 14px;
    }
    .container {
      max-width: 510px;
      margin: 2em auto;
      background: #fff;
      padding: 1.5em 2em;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(44,62,80,0.08);
    }
    h1 {
      font-size: 1.2em;
      color: #2872d1;
      text-align: center;
      margin-bottom: 1.2em;
      font-weight: 600;
    }
    .section-title {
      font-weight: 600;
      color: #2872d1;
      margin-top: 1.2em;
      margin-bottom: 0.6em;
      font-size: 1em;
      letter-spacing: 0.5px;
      text-align: left;
    }
    ol {
      margin-left: 1.4em;
      font-size: 13px;
      margin-bottom: 0.8em;
      padding-left: 0.2em;
    }
    ul {
      margin-left: 1.6em;
      margin-top: 0.3em;
      margin-bottom: 0.3em;
      font-size: 12px;
      padding-left: 0.2em;
    }
    li {
      margin-bottom: 0.5em;
      line-height: 1.6;
    }
    .action {
      background: #e9f2fd;
      color: #2872d1;
      border-radius: 4px;
      padding: 1px 6px;
      font-weight: 500;
      font-size: 13px;
      margin: 0 2px;
      display: inline-block;
    }
    .menu {
      font-weight: 500;
      color: #444;
      background: #f5f5fa;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 13px;
      border: 1px solid #dbeafe;
      margin: 0 2px;
      display: inline-block;
    }
    .signature {
      font-weight: 500;
      color: #1c7f4e;
      background: #f5fff7;
      border: 1px solid #b6e3cd;
      border-radius: 4px;
      padding: 1px 8px;
      margin: 0 2px;
      font-size: 13px;
      display: inline-block;
      vertical-align: middle;
    }
    .note {
      font-size: 12px;
      color: #737373;
      margin-top: 0.5em;
      text-align: center;
    }
    @media (max-width: 620px) {
      .container { max-width: 95vw; padding: 1em; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Instructions for Completing Pending Forms</h1>
    <div class="section-title">Filling Out Forms</div>
    <ol>
      <li>
        Select a form from the list on the left by clicking the appropriate button.
        After selection, the page will go to full page. To exit, click the
        <span class="menu">Action menu</span> horizontal barred button to toggle page mode.
      </li>
      <li>
        Answer all the required queries in the form.
      </li>
      <li>
        When finished, click either the <span class="action">Save</span> or <span class="action">Submit Document</span> option in the top <span class="menu">Action Menu</span>.
        <ul>
          <li>
            The <span class="action">Save</span> button will save your form to <strong>Document History</strong> and keep it available for editing until you delete or submit it.
          </li>
          <li>
            Use <span class="action">Submit Document</span> to send your completed form to your provider.
          </li>
        </ul>
      </li>
    </ol>
    <div class="section-title">Sending Documents</div>
    <ol>
      <li>
        Click the <span class="action">Submit Document</span> button in the <span class="menu">Action Menu</span>.
      </li>
      <li>
        After sending, your form appears in <strong>Document History</strong> as <span class="action">Pending review</span>. You may still make changes until it is reviewed by the practice administrator.
      </li>
      <li>
        Once reviewed, your form will show as <span class="action">Locked</span>; no further edits are available. Your completed document is then recorded in your chart (medical record).
      </li>
    </ol>
    <div class="section-title">Signing Documents</div>
    <ol>
      <li>
        Create or redo your on-file signature by clicking the <span class="action">Edit Signature</span> button in the top <span class="menu">Actions Menu</span>.
        You may also manage your signature from the main top menu under <span class="menu">My Signature</span>.
      </li>
      <li>
        To add your signature to a document, simply click the appropriate
        <span class="signature">Sign Here 'X'</span>.{PatientSignature}
      </li>
      <li>
        To remove a signature, click the signature to return to the default
        <span class="signature">Sign Here 'X'</span>.{PatientSignature}
      </li>
    </ol>
    <div class="note">
      Follow these steps to ensure your documents are completed and submitted accurately.<br>
      If you need help, please contact support.
    </div>
  </div>
</body>
</html>`;

const TEMPLATE_INSURANCE = `INSURANCE INFORMATION
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Insurance Information</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f8f9fa;
      color: #222;
      font-size: 14px;
      margin: 0;
    }
    .container {
      max-width: 540px;
      margin: 2em auto;
      background: #fff;
      padding: 2em 2em 1.2em 2em;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(44,62,80,0.08);
    }
    h1 {
      font-size: 1.3em;
      color: #2872d1;
      margin-bottom: 1em;
      text-align: center;
      font-weight: 600;
    }
    .form-section {
      margin-bottom: 1.2em;
      padding-bottom: 0.6em;
      border-bottom: 1px solid #f0f0f0;
    }
    .form-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 0.6em;
      gap: 1em;
    }
    .form-row label {
      font-weight: 500;
      font-size: 13px;
      min-width: 95px;
      margin-right: 6px;
    }
    .form-row input[type="text"],
    .form-row input[type="tel"],
    .form-row input[type="date"] {
      font-size: 13px;
      padding: 2px 7px;
      margin-right: 8px;
      width: 135px;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .form-row input[type="checkbox"],
    .form-row input[type="radio"] {
      margin-right: 6px;
      accent-color: #2872d1;
    }
    .radio-group {
      margin-left: 0.4em;
      margin-bottom: 0.3em;
    }
    .date-time-area {
      display: flex;
      align-items: center;
      gap: 0.6em;
      color: #2872d1;
      font-weight: 500;
      font-size: 13px;
      margin-top: 2em;
      margin-bottom: 0.7em;
    }
    .date-time-area input[type="date"],
    .date-time-area input[type="time"] {
      padding: 3px 7px;
      border-radius: 4px;
      border: 1px solid #ccc;
      font-size: 13px;
      width: 120px;
      box-sizing: border-box;
    }
    .signature-label {
      font-weight: 500;
      font-size: 13px;
      min-width: 70px;
      margin-right: 8px;
    }
    .signature-box {
      min-width: 160px;
      max-width: 220px;
      height: 32px;
      display: flex;
      align-items: center;
      margin-bottom: 1.5em;
    }
    .signature-input, .signature-tag {
      width: 100%;
      font-size: 13px;
      padding: 4px 10px;
      border: 1px solid #b6e3cd;
      border-radius: 4px;
      background: #f5fff7;
      color: #1c7f4e;
      font-weight: 500;
      text-align: left;
      box-sizing: border-box;
    }
    .submit-btn {
      margin: 0.5em auto 0 auto;
      display: block;
      background: #2872d1;
      color: #fff;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      padding: 0.7em 2em;
      font-size: 15px;
      box-shadow: 0 2px 8px rgba(44,62,80,0.07);
      cursor: pointer;
      transition: background 0.2s;
    }
    .submit-btn:hover,
    .submit-btn:focus {
      background: #195ba3;
      outline: none;
    }
    @media (max-width: 700px) {
      .container { max-width: 99vw; padding: 1em; }
      .form-row input[type="text"] { width: 100px; }
      .date-time-area { flex-direction: column; align-items: flex-start; gap: 0.4em; }
      .signature-box { width: 100%; }
      .submit-btn { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>INSURANCE INFORMATION</h1>
    <form>
      <div class="form-section">
        <div class="form-row">
          <input type="checkbox" id="medicare">
          <label for="medicare">Medicare#</label>
          <input type="text" name="medicareNumber">
        </div>
        <div class="form-row">
          <input type="checkbox" id="medicaid">
          <label for="medicaid">Medicaid#</label>
          <input type="text" name="medicaidNumber">
        </div>
        <div class="form-row">
          <input type="checkbox" id="workersComp">
          <label for="workersComp">Workers Compensation (job injury)</label>
          <span>If so then to whom is bill to be sent?</span>
          <input type="text" name="workersCompBillTo">
        </div>
        <div class="form-row">
          <input type="checkbox" id="otherIns">
          <label for="otherIns">Other Medical Insurance:</label>
          <span>Group#</span>
          <input type="text" name="otherGroupNumber">
          <span>ID#</span>
          <input type="text" name="otherIDNumber">
        </div>
      </div>
      <div class="form-section">
        <div class="form-row">
          <label>Name/Address 1st or 2nd Insurance:</label>
        </div>
        <div class="form-row">
          <label for="insName1">Name:</label>
          <input type="text" id="insName1" name="insName1">
          <label for="insRel1">Relationship:</label>
          <input type="text" id="insRel1" name="insRel1">
        </div>
        <div class="form-row">
          <label for="insAddr1">Address:</label>
          <input type="text" id="insAddr1" name="insAddr1">
          <label for="insState1">State:</label>
          <input type="text" id="insState1" name="insState1">
          <label for="insZip1">Zip:</label>
          <input type="text" id="insZip1" name="insZip1">
        </div>
        <div class="form-row">
          <label for="insPhone1">Phone:</label>
          <input type="tel" id="insPhone1" name="insPhone1">
          <label for="insSecPhone1">Secondary Phone:</label>
          <input type="tel" id="insSecPhone1" name="insSecPhone1">
        </div>
      </div>
      <div class="form-section">
        <div class="form-row">
          <label>Are you personally responsible for the payment of your fees?</label>
          <span class="radio-group">
            <input type="radio" name="personallyResponsible" value="yes" id="respYes"><label for="respYes">Yes</label>
            <input type="radio" name="personallyResponsible" value="no" id="respNo"><label for="respNo">No</label>
          </span>
        </div>
        <div class="form-row">
          <label>If not, who is?</label>
        </div>
        <div class="form-row">
          <label for="respName">Name:</label>
          <input type="text" id="respName" name="respName">
          <label for="respRel">Relationship:</label>
          <input type="text" id="respRel" name="respRel">
          <label for="respDOB">DOB:</label>
          <input type="date" id="respDOB" name="respDOB">
        </div>
        <div class="form-row">
          <label for="respAddr">Address:</label>
          <input type="text" id="respAddr" name="respAddr">
          <label for="respState">State:</label>
          <input type="text" id="respState" name="respState">
          <label for="respZip">Zip:</label>
          <input type="text" id="respZip" name="respZip">
        </div>
        <div class="form-row">
          <label for="respPhone">Phone:</label>
          <input type="tel" id="respPhone" name="respPhone">
          <label for="respSecPhone">Secondary Phone:</label>
          <input type="tel" id="respSecPhone" name="respSecPhone">
        </div>
      </div>
      <div class="form-section">
        <div class="form-row">
          <label>Who to notify in emergency (nearest relative or friend)?</label>
        </div>
        <div class="form-row">
          <label for="emName">Name:</label>
          <input type="text" id="emName" name="emName">
          <label for="emRel">Relationship:</label>
          <input type="text" id="emRel" name="emRel">
        </div>
        <div class="form-row">
          <label for="emAddr">Address:</label>
          <input type="text" id="emAddr" name="emAddr">
          <label for="emState">State:</label>
          <input type="text" id="emState" name="emState">
          <label for="emZip">Zip:</label>
          <input type="text" id="emZip" name="emZip">
        </div>
        <div class="form-row">
          <label for="emWorkPhone">Work Phone:</label>
          <input type="tel" id="emWorkPhone" name="emWorkPhone">
          <label for="emHomePhone">Home Phone:</label>
          <input type="tel" id="emHomePhone" name="emHomePhone">
        </div>
      </div>
      <!-- Date and Time Area Before Signature -->
      <div class="date-time-area">
        <label for="currentDate">Date:</label>
        <input type="date" id="currentDate" name="currentDate">
        <label for="currentTime">Time:</label>
        <input type="time" id="currentTime" name="currentTime">
      </div>
      <!-- Signature Area at End -->
      <div class="signature-box">
        <label for="patientSignature" class="signature-label">Signature:</label>
        <input type="text" id="patientSignature" name="patientSignature" class="signature-input" placeholder="Signature">
      </div>
      <button type="submit" class="submit-btn">Submit</button>
    </form>
  </div>
</body>
</html>`;

const TEMPLATE_PRIVACY = `NOTICE OF PRIVACY PRACTICES PATIENT ACKNOWLEDGEMENT AND CONSENT TO MEDICAL TREATMENT
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Notice of Privacy Practices</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f8f9fa;
      color: #222;
      font-size: 14px;
      margin: 0;
    }
    .container {
      max-width: 600px;
      margin: 2em auto;
      background: #fff;
      padding: 2em;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(44,62,80,0.08);
    }
    h1 {
      font-size: 1.3em;
      color: #2872d1;
      text-align: center;
      margin-bottom: 1.5em;
    }
    .section-title {
      font-weight: 600;
      color: #2872d1;
      margin-bottom: 0.8em;
      font-size: 1.1em;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 0.3em;
    }
    .form-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 1em;
      gap: 1em;
    }
    .form-row label {
      font-weight: 500;
      font-size: 13px;
      min-width: 140px;
    }
    .form-row input[type="text"],
    .form-row input[type="date"],
    .form-row input[type="checkbox"],
    .form-row input[type="radio"] {
      font-size: 13px;
      padding: 5px 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      box-sizing: border-box;
    }
    .form-row input[type="checkbox"],
    .form-row input[type="radio"] {
      margin-right: 6px;
      accent-color: #2872d1;
    }
    .textarea {
      width: 100%;
      height: 80px;
      font-size: 13px;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      box-sizing: border-box;
    }
    .signature-area {
      margin-top: 1.5em;
    }
    .signature-label {
      font-weight: 500;
      font-size: 13px;
      margin-right: 8px;
    }
    .signature-box {
      padding: 6px 10px;
      border: 1px solid #b6e3cd;
      border-radius: 4px;
      background: #f5fff7;
      color: #1c7f4e;
      font-weight: 500;
      display: inline-block;
      min-width: 150px;
      text-align: center;
    }
    .submit-btn {
      margin: 2em auto 0 auto;
      display: block;
      background: #2872d1;
      color: #fff;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      padding: 0.7em 2em;
      font-size: 15px;
      box-shadow: 0 2px 8px rgba(44,62,80,0.07);
      cursor: pointer;
      transition: background 0.2s;
    }
    .submit-btn:hover,
    .submit-btn:focus {
      background: #195ba3;
      outline: none;
    }
    @media (max-width: 700px) {
      .container { max-width: 95vw; padding: 1em; }
      .form-row { flex-direction: column; align-items: flex-start; }
      .submit-btn { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>NOTICE OF PRIVACY PRACTICES</h1>
    <form>
      <div class="section-title">Patient Information</div>
      <div class="form-row">
        <label for="patientName">Patient Name:</label>
        <input type="text" id="patientName" name="patientName" placeholder="Enter Patient Name">
      </div>
      <div class="form-row">
        <label for="patientDOB">Date of Birth:</label>
        <input type="date" id="patientDOB" name="patientDOB">
      </div>

      <div class="section-title">Acknowledgement</div>
      <p>
        I have received and understand this practice's Notice of Privacy Practices written in plain English.
        The notice provides in detail the uses and disclosures of my protected health information that may
        be made by this practice, my individual rights, how I may exercise those rights, and the practice's
        legal duties with respect to my information. I understand that the practice reserves the right to change
        the terms of the Privacy Practices, and to make changes regarding all protected health information. If
        changes occur, the practice will provide me with a revised copy upon request.
      </p>

      <div class="section-title">Consent for Treatment</div>
      <p>
        I voluntarily consent to care, including physician examination and tests such as x-ray, laboratory tests,
        and to medical treatment by my physician or his/her assistants or designees, as may be necessary in the
        judgment of my physician. No guarantees have been made to me as the result of treatment or examination.
      </p>

      <div class="section-title">Authorization for Payment</div>
      <p>
        In consideration for services received by <input type="text" name="referringDoc" placeholder="Enter Referring Doctor">
        I agree to pay any and all charges as billed. I also request that direct payments be made to the referring doctor on
        my behalf by insurers and agencies in the settlement of any of my claims. I understand that my protected health
        information may need to be released for the purpose of treatment, payment, or health care operations.
      </p>

      <div class="form-row">
        <label for="comments">Comments:</label>
        <textarea id="comments" name="comments" class="textarea" placeholder="Enter any additional comments here"></textarea>
      </div>

      <div class="section-title">Medicare Patients</div>
      <p>
        I certify that the information given by me for application for payment under title XVIII of the Social Security Act
        is correct. I authorize any holder of medical or other relevant information about me to be released to the Social
        Security Administration or its intermediaries or carriers and such information needed to support application for
        payment, including records pertaining to HIV status or treatment (AIDS records), drug and alcohol treatment, and
        psychiatric treatment. I assign and authorize payment directly to the referring doctor for the unpaid charges for
        the physician's services. I understand that I am responsible for all insurance deductibles and coinsurance.
      </p>

      <div class="form-row">
        <label for="relationship">Relationship to Patient:</label>
        <input type="text" id="relationship" name="relationship" placeholder="Enter relationship (if signed by a representative)">
      </div>
      <div class="form-row">
        <label>Are you the Primary Caregiver?</label>
        <input type="radio" id="caregiverYes" name="primaryCaregiver" value="yes">
        <label for="caregiverYes">Yes</label>
        <input type="radio" id="caregiverNo" name="primaryCaregiver" value="no">
        <label for="caregiverNo">No</label>
      </div>

      <div class="date-time-area">
        <label for="currentDate">Date:</label>
        <input type="date" id="currentDate" name="currentDate">
      </div>

      <div class="signature-area">
        <label for="patientSignature" class="signature-label">Patient Signature:</label>
      {AdminSignature}
      </div>

      <div class="signature-area">
        <label for="adminSignature" class="signature-label">Clinic Representative:</label>
        <input type="text" id="adminSignature" name="adminSignature" class="signature-box" placeholder="Clinic Representative Signature">
      </div>

      <button type="submit" class="submit-btn">Submit</button>
    </form>
  </div>
</body>
</html>`;

/* =========================================================
   Clipboard helper
   ========================================================= */
async function copyToClipboard(text: string): Promise<"success"|"blocked"|"unavailable"> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return "success";
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.readOnly = true; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); document.body.removeChild(ta);
    return ok ? "success" : "blocked";
  } catch { return "unavailable"; }
}

/* =========================================================
   Token → HTML (incl. OrgLogo + signatures)
   ========================================================= */
function signatureHTML(id: string) {
  return `
  <div class="sig-pad my-1">
    <canvas id="sig_${id}" class="w-full h-28 rounded-md border border-dashed border-gray-300 bg-white"></canvas>
    <div class="flex justify-end gap-2 mt-2">
      <button type="button" class="sig-clear px-3 py-1.5 rounded border text-sm">Clear</button>
    </div>
    <input type="hidden" name="signature_${id}" />
  </div>`;
}
function signatureInlineHTML(id: string) {
  return `
  <span class="inline-block align-middle sig-pad mx-1">
    <canvas id="sig_${id}" class="w-36 h-10 rounded border border-dashed border-gray-300 bg-white"></canvas>
    <input type="hidden" name="signature_${id}" />
  </span>`;
}
function orgLogoHTML(src?: string) {
  if (src) {
    return `
    <div class="inline-flex items-center gap-2">
      <img src="${src}" alt="Org Logo" class="org-logo rounded-md"
           style="max-width:160px; max-height:48px; object-fit:contain; background:#fff; border:1px solid #e5e7eb; padding:4px;" />
    </div>`;
  }
  return `
  <div class="inline-flex items-center gap-2">
    <div class="org-logo inline-flex items-center justify-center bg-gray-200 text-gray-600 rounded-md"
         style="width:120px;height:40px;">
      Org&nbsp;Logo
    </div>
  </div>`;
}

function replaceTokens(raw: string) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const timeStr = today.toTimeString().slice(0, 5);

  let html = raw;
  const baseInput = `class="doc-input"`;

  html = html
    .replace(/\{TextInput\}/g, `<input type="text" ${baseInput} />`)
    .replace(/\{TextBox:(\d{2})x(\d{3})\}/g, (_m, rows) => `<textarea rows="${Number(rows)}" ${baseInput}></textarea>`)
    .replace(/\{TextBox\}/g, `<textarea rows="4" ${baseInput}></textarea>`)
    .replace(/\{CheckMark\}/g, `<input type="checkbox" class="doc-check" />`)
    .replace(/\{ynRadioGroup\}/g, `<span class="doc-radio"><label><input type="radio" name="yn_${uid()}" value="Yes"/> Yes</label><label><input type="radio" name="yn_${uid()}" value="No"/> No</label></span>`)
    .replace(/\{PatientSignature\}/g, signatureHTML(uid()))
    .replace(/\{AdminSignature\}/g, signatureHTML(uid()))
    // OrgLogo with URL (", ', or no quotes)
    .replace(/\{OrgLogo:\s*"([^"]+)"\}/g, (_m, url) => orgLogoHTML(url))
    .replace(/\{OrgLogo:\s*'([^']+)'\}/g, (_m, url) => orgLogoHTML(url))
    .replace(/\{OrgLogo:\s*(https?:\/\/[^\s}]+)\s*\}/g, (_m, url) => orgLogoHTML(url))
    // fallback no-URL
    .replace(/\{OrgLogo\}/g, orgLogoHTML())
    .replace(/\{CurrentDate:"global"\}/g, `<input type="date" value="${todayStr}" ${baseInput} />`)
    .replace(/\{CurrentTime\}/g, `<input type="time" value="${timeStr}" ${baseInput} />`)
    .replace(/\{DOS\}/g, `<input type="date" value="${todayStr}" ${baseInput} />`)
    .replace(/\{PatientName\}/g, `<input type="text" ${baseInput} />`)
    .replace(/\{PatientDOB\}/g, `<input type="date" max="${todayStr}" ${baseInput} />`)
    .replace(/\{PatientSex\}/g, `<select ${baseInput}><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select>`)
    .replace(/\{PatientID\}/g, `<input type="text" ${baseInput} />`)
    .replace(/\{PatientPhone\}/g, `<input type="tel" ${baseInput} />`)
    .replace(/\{Address\}/g, `<input type="text" ${baseInput} />`)
    .replace(/\{City\}/g, `<input type="text" ${baseInput} />`)
    .replace(/\{State\}/g, `<input type="text" ${baseInput} />`)
    .replace(/\{Zip\}/g, `<input type="text" ${baseInput} />`)
    .replace(/\{ReferringDOC\}/g, `<input type="text" ${baseInput} />`);

  // Replace “X” hotspots with inline signature
  html = html
    .replace(/‘X’|’X’|“X”|”X”|\'X\'|\"X\"/g, signatureInlineHTML(uid()))
    .replace(/(?:\s|\b)X(\s|\b)/g, (_m, tail) => " " + signatureInlineHTML(uid()) + (tail || " "));

  return html;
}

/* =========================================================
   Preview document wrapper (Tailwind inside iframe)
   ========================================================= */
function signatureInit() {
  document.querySelectorAll('.sig-pad').forEach(wrapper => {
    const canvas = wrapper.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const hidden = wrapper.querySelector('input[type="hidden"]') as HTMLInputElement | null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let drawing = false;
    let lastX = 0, lastY = 0;

    function size() {
      if (!canvas || !ctx) return; // Guards to satisfy strict null checks
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * ratio);
      canvas.height = Math.max(1, rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827';
    }
    size(); window.addEventListener('resize', size);

    const pos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const point: MouseEvent | Touch = (e as TouchEvent).touches ? (e as TouchEvent).touches[0] : (e as MouseEvent);
      return { x: point.clientX - r.left, y: point.clientY - r.top };
    };
    const down = (e: MouseEvent | TouchEvent) => { drawing = true; const { x, y } = pos(e); lastX = x; lastY = y; };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = pos(e);
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
      lastX = x; lastY = y;
      if (hidden) hidden.value = canvas.toDataURL('image/png');
    };
    const up = () => { drawing = false; };

    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);

    wrapper.querySelector<HTMLButtonElement>('.sig-clear')?.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (hidden) hidden.value = '';
    });
  });
}

function baseHTMLWrapper(title: string, contentInner: string, _options: TemplateOptions) {
  const wrapper = `<div class="max-w-3xl mx-auto">${contentInner}</div>`;

  return `<!doctype html>
<html lang="en" data-context="${_options.context}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<style>
:root{}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;padding:2rem;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji";background:linear-gradient(to bottom,#f8fafc,#f1f5f9);color:#0f172a}
.doc-card{margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:2rem;box-shadow:0 10px 30px rgba(2,6,23,.08), 0 2px 8px rgba(2,6,23,.05)}
.max-w-prose{max-width:65ch;margin-left:auto;margin-right:auto}.max-w-2xl{max-width:42rem;margin-inline:auto}.max-w-3xl{max-width:48rem;margin-inline:auto}
.doc-prose{line-height:1.65}.doc-prose h1{font-size:1.75rem;margin:0 0 .75rem;font-weight:600}
.doc-prose h2{font-size:1.35rem;margin:1rem 0 .5rem;font-weight:600}
.doc-prose h3{font-size:1.15rem;margin:.85rem 0 .4rem;font-weight:600}
.doc-prose p{margin:.65rem 0}.doc-prose ul{margin:.4rem 0 .7rem 1.25rem}.doc-prose li{margin:.2rem 0}
.doc-prose table{width:100%;border-collapse:collapse;margin:.75rem 0;border:1px solid #e5e7eb}
.doc-prose th,.doc-prose td{border:1px solid #e5e7eb;padding:.5rem .6rem;text-align:left}
.doc-prose hr{border:0;border-top:1px solid #e5e7eb;margin:1rem 0}
.doc-input,.doc-check,select,textarea{font:inherit;color:inherit;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:.55rem .75rem}
.doc-radio{display:inline-flex;align-items:center;gap:1rem}.doc-radio label{display:inline-flex;align-items:center;gap:.5rem}
.sig-pad canvas{width:100%;height:100%;touch-action:none;display:block}
.org-logo{display:inline-flex;align-items:center;justify-content:center;font-weight:600;letter-spacing:.2px}
</style>
</head>
<body>
<article class="doc-prose">${wrapper}</article>
<script>(${signatureInit.toString()})();</script>
</body>
</html>`;
}

function extractBodyOrAll(html: string) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  const htmlMatch = html.match(/<html[^>]*>([\s\S]*?)<\/html>/i);
  if (htmlMatch) return htmlMatch[1];
  return html;
}

function buildPreviewHTML(title: string, templateText: string, options: TemplateOptions) {
  if (!templateText.trim()) return baseHTMLWrapper(title || "Template", "<p></p>", options);

  const replaced = replaceTokens(templateText);

  if (isFullHTMLDocument(replaced) && options.applyWrapperToFullHTML) {
    const inner = `<div class="doc-card">${extractBodyOrAll(replaced)}</div>`;
    return baseHTMLWrapper(title || "Template", inner, options);
  }

  if (isFullHTMLDocument(replaced)) {
    const scriptTag = `<script>(${signatureInit.toString()})();</script>`;
    return /<\/body>/i.test(replaced)
      ? replaced.replace(/<\/body>/i, scriptTag + "</body>")
      : replaced + scriptTag;
  }

  if (isLikelyHTML(replaced)) {
    const inner = `<div class="doc-card">${replaced}</div>`;
    return baseHTMLWrapper(title || "Template", inner, options);
  }

  const para = replaced
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  const inner = `<div class="doc-card">${para}</div>`;
  return baseHTMLWrapper(title || "Template", inner, options);
}

/* =========================================================
   Component
   ========================================================= */
export default function TemplateStudio() {
  // Editor
  const [title, setTitle] = useState<string>("");
  const [templateText, setTemplateText] = useState<string>("");
  const [tplOptions, setTplOptions] = useState<TemplateOptions>({
    theme: "slate",
    container: "normal",
    card: true,
    applyWrapperToFullHTML: false,
    context: "encounter",
  });
  const [currentId, setCurrentId] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const lastPush = useRef(0);
  const pushHistory = () => {
    const now = Date.now();
    if (now - lastPush.current < 250) return;
    lastPush.current = now;
    setHistory((h) => [...h, { title, templateText, tplOptions, currentId }]);
    setFuture([]);
  };
  const undo = () => setHistory(h => {
    if (!h.length) return h;
    const prev = h[h.length-1];
    setFuture(f => [{ title, templateText, tplOptions, currentId }, ...f]);
    setTitle(prev.title); setTemplateText(prev.templateText); setTplOptions(prev.tplOptions); setCurrentId(prev.currentId);
    return h.slice(0, -1);
  });
  const redo = () => setFuture(f => {
    if (!f.length) return f;
    const [next, ...rest] = f;
    setHistory(h => [...h, { title, templateText, tplOptions, currentId }]);
    setTitle(next.title); setTemplateText(next.templateText); setTplOptions(next.tplOptions); setCurrentId(next.currentId);
    return rest;
  });

  // Saved (from server)
  const [myTemplates, setMyTemplates] = useState<SavedTemplate[]>([]);
  const [filter, setFilter] = useState("");

  const filteredTemplates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const byContext = myTemplates.filter(t => (t.options?.context || "encounter") === tplOptions.context);
    if (!q) return byContext;
    return byContext.filter(t => t.name.toLowerCase().includes(q));
  }, [myTemplates, tplOptions.context, filter]);

  // Draft persist only (keep)
  useEffect(() => {
    try {
      const d = localStorage.getItem(LS_DRAFT);
      if (d) {
        const obj = JSON.parse(d);
        if (obj) {
          setTitle(obj.title||"");
          setTemplateText(obj.templateText||"");
          if (obj.tplOptions) setTplOptions({ context: obj.tplOptions.context ?? "encounter", ...obj.tplOptions });
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem(LS_DRAFT, JSON.stringify({ title, templateText, tplOptions })); } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [title, templateText, tplOptions]);

  // Load list from server when context changes
  useEffect(() => {
    (async () => {
      try {
        const ctx = toServerContext(tplOptions.context);
        const rows = await apiListTemplates(ctx);
        const mapped: SavedTemplate[] = rows.map((t) => {
          const opts = typeof t.options === "string" ? JSON.parse(t.options) : (t.options || {});
          return {
            id: String(t.id),
            name: t.name,
            content: t.content,
            options: {
              theme: opts.theme ?? tplOptions.theme,
              container: opts.container ?? tplOptions.container,
              card: opts.card ?? tplOptions.card,
              applyWrapperToFullHTML: opts.applyWrapperToFullHTML ?? tplOptions.applyWrapperToFullHTML,
              context: fromServerContext(t.context),
            },
            updatedAt: t.updatedAt ? new Date(t.updatedAt).getTime() : Date.now(),
          };
        });
        setMyTemplates(mapped);
      } catch (e) {
        console.warn("Failed to load templates from server:", e);
      }
    })();
  // We intentionally only re-run when context changes to avoid unnecessary reloads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplOptions.context]);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewHTML = useMemo(() => buildPreviewHTML(title, templateText, tplOptions), [title, templateText, tplOptions]);

  // Toast Notification System
  const [toasts, setToasts] = useState<Array<{id:string, msg:string, type?:"success"|"error"|"info"}>>([]);
  const showToast = (msg: string, type?: "success"|"error"|"info") => {
    const id = uid();
    const duration = type === "error" ? 5000 : 3000; // Errors stay longer
    setToasts(t => [...t, {id, msg, type}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  };

  // New
  const newTemplate = () => { pushHistory(); setTitle(""); setTemplateText(""); setCurrentId(null); };

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const openSaveDialog = (defaultName?: string) => { setSaveName(defaultName ?? (title || "Untitled Template")); setSaveOpen(true); };

  // Create-or-update on server
  async function performSave(name: string) {
    const body: UpsertBody = {
      name: name || title || "Untitled Template",
      context: toServerContext(tplOptions.context),
      content: templateText,
      options: {
        theme: tplOptions.theme,
        container: tplOptions.container,
        card: tplOptions.card,
        applyWrapperToFullHTML: tplOptions.applyWrapperToFullHTML,
      },
    };

    try {
      let saved: ServerTemplate;
      if (currentId) {
        saved = await apiUpdateTemplate(Number(currentId), body);
        showToast("Saved successfully", "success");
      } else {
        saved = await apiCreateTemplate(body);
        showToast("Saved successfully", "success");
      }

      // sync editor and id from server
      const opts = typeof saved.options === "string" ? JSON.parse(saved.options) : (saved.options || {});
      setCurrentId(String(saved.id));
      setTitle(saved.name);
      setTemplateText(saved.content);
      setTplOptions((s) => ({
        ...s,
        context: fromServerContext(saved.context),
        theme: opts.theme ?? s.theme,
        container: opts.container ?? s.container,
        card: opts.card ?? s.card,
        applyWrapperToFullHTML: opts.applyWrapperToFullHTML ?? s.applyWrapperToFullHTML,
      }));

      // refresh list
      const rows = await apiListTemplates(toServerContext(fromServerContext(saved.context)));
      const mapped: SavedTemplate[] = rows.map((t) => {
        const o = typeof t.options === "string" ? JSON.parse(t.options) : (t.options || {});
        return {
          id: String(t.id),
          name: t.name,
          content: t.content,
          options: { ...o, context: fromServerContext(t.context) },
          updatedAt: t.updatedAt ? new Date(t.updatedAt).getTime() : Date.now(),
        };
      });
      setMyTemplates(mapped);
    } catch (e: unknown) {
      console.error(e);
      let errMsg = "Failed to save";
      if (e instanceof Error) {
        try {
          const parsed = JSON.parse(e.message);
          errMsg = parsed.message || e.message;
        } catch {
          errMsg = e.message;
        }
      }
      showToast(errMsg, "error");
    } finally {
      setSaveOpen(false);
    }
  }

  const saveTemplate = () => {
    if (!currentId) openSaveDialog(title || "Untitled Template");
    else performSave(title || "Untitled Template");
  };

  // Delete (server)
  const [pendingDelete, setPendingDelete] = useState<SavedTemplate | null>(null);
  const requestDelete = (t: SavedTemplate) => { setPendingDelete(t); };
  const performDelete = async () => {
    const t = pendingDelete; if (!t) return;
    setPendingDelete(null);
    try {
      await apiDeleteTemplate(Number(t.id));
      setMyTemplates(prev => prev.filter(x => x.id !== t.id));
      if (t.id === currentId) { setCurrentId(null); setTitle(""); setTemplateText(""); }
      showToast("Deleted successfully", "success");
    } catch (e: unknown) {
      console.error(e);
      let errMsg = "Failed to delete";
      if (e instanceof Error) {
        try {
          const parsed = JSON.parse(e.message);
          errMsg = parsed.message || e.message;
        } catch {
          errMsg = e.message;
        }
      }
      showToast(errMsg, "error");
    }
  };

  // Import (create on server)
  const importAnything = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const f = evt.target.files?.[0]; if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = async () => {
      const text = String(reader.result || "");

      const createOne = async (name: string, content: string) => {
        const body: UpsertBody = {
          name,
          context: toServerContext(tplOptions.context),
          content,
          options: {
            theme: tplOptions.theme,
            container: tplOptions.container,
            card: tplOptions.card,
            applyWrapperToFullHTML: tplOptions.applyWrapperToFullHTML,
          },
        };
        const saved = await apiCreateTemplate(body);
        return saved;
      };

      try {
        if (ext === "json") {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            for (const t of parsed) {
              await createOne(String(t.name || "Imported Template"), String(t.content || ""));
            }
            showToast(`Imported ${parsed.length} ${tplOptions.context} templates.`, "success");
          } else if (parsed && typeof parsed === "object" && ("content" in parsed || "title" in parsed || "name" in parsed)) {
            const saved = await createOne(String(parsed.name || parsed.title || "Imported Template"), String(parsed.content ?? ""));
            const o = typeof saved.options === "string" ? JSON.parse(saved.options) : (saved.options || {});
            pushHistory();
            setCurrentId(String(saved.id));
            setTitle(saved.name);
            setTemplateText(saved.content);
            setTplOptions((s) => ({
              ...s,
              context: fromServerContext(saved.context),
              theme: o.theme ?? s.theme, container: o.container ?? s.container, card: o.card ?? s.card,
              applyWrapperToFullHTML: o.applyWrapperToFullHTML ?? s.applyWrapperToFullHTML,
            }));
            showToast("Imported form into editor (server).", "success");
          } else {
            const saved = await createOne(f.name.replace(/\.[^.]+$/, "") || "Imported Template", text);
            const o = typeof saved.options === "string" ? JSON.parse(saved.options) : (saved.options || {});
            pushHistory();
            setCurrentId(String(saved.id));
            setTitle(saved.name);
            setTemplateText(saved.content);
            setTplOptions((s) => ({ ...s, context: fromServerContext(saved.context), ...o }));
            showToast("Imported into editor (server).", "success");
          }
        } else {
          const defaultName = f.name.replace(/\.[^.]+$/, "") || "Imported Template";
          const saved = await createOne(defaultName, text);
          const o = typeof saved.options === "string" ? JSON.parse(saved.options) : (saved.options || {});
          pushHistory();
          setCurrentId(String(saved.id));
          setTitle(saved.name);
          setTemplateText(saved.content);
          setTplOptions((s) => ({ ...s, context: fromServerContext(saved.context), ...o }));
          showToast("Imported into editor (server).", "success");
        }

        // refresh list after import
        const rows = await apiListTemplates(toServerContext(tplOptions.context));
        const mapped: SavedTemplate[] = rows.map((t) => {
          const o = typeof t.options === "string" ? JSON.parse(t.options) : (t.options || {});
          return {
            id: String(t.id),
            name: t.name,
            content: t.content,
            options: { ...o, context: fromServerContext(t.context) },
            updatedAt: t.updatedAt ? new Date(t.updatedAt).getTime() : Date.now(),
          };
        });
        setMyTemplates(mapped);
      } catch (err) {
        console.error(err);
  showToast("Import failed", "error");
      } finally {
        evt.target.value = "";
      }
    };

    reader.readAsText(f);
  };

  // Editor counts (SINGLE definition)
  const counts = useMemo(() => {
    const t = templateText.trim();
    return { words: t ? t.split(/\s+/).length : 0, chars: t.length };
  }, [templateText]);

  // Token insert
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart ?? templateText.length;
    const end = ta.selectionEnd ?? templateText.length;

    const next = templateText.slice(0, start) + text + templateText.slice(end);
    pushHistory();
    setTemplateText(next);

    // restore cursor after insert
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    }, 0);
  };


  // Defaults loader
  const loadDefault = (key: "HIPAA"|"HELP"|"INS"|"PRIV") => {
    const map = {
      HIPAA: { title: "HIPAA Declaration", content: TEMPLATE_HIPAA },
      HELP:  { title: "Help / Pending Forms", content: TEMPLATE_HELP },
      INS:   { title: "Insurance Information", content: TEMPLATE_INSURANCE },
      PRIV:  { title: "Privacy Practices & Consent", content: TEMPLATE_PRIVACY },
    } as const;
    const sel = map[key];
    pushHistory(); setCurrentId(null); setTitle(sel.title); setTemplateText(sel.content);
  };

  // Utilities (necessary only)
  const trimContent = () => { pushHistory(); setTemplateText(templateText.trim()); showToast("Trimmed.", "info"); };
  const normalizeNewlines = () => { pushHistory(); setTemplateText(templateText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n")); showToast("Normalized newlines.", "info"); };
  const smartToAsciiQuotes = () => { pushHistory(); setTemplateText(templateText.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")); showToast("Converted smart quotes.", "info"); };
  const stripHTMLTags = () => { pushHistory(); setTemplateText(templateText.replace(/<\/?[^>]+>/g, "")); showToast("Stripped HTML tags.", "info"); };
  const minifyWhitespace = () => { pushHistory(); setTemplateText(templateText.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ")); showToast("Minified whitespace.", "info"); };

  // Load one template from server by ID (on list click)
  const loadTemplate = async (t: SavedTemplate) => {
    try {
      const row = await apiGetTemplate(Number(t.id));
      const opts = typeof row.options === "string" ? JSON.parse(row.options) : (row.options || {});
      pushHistory();
      setCurrentId(String(row.id));
      setTitle(row.name);
      setTemplateText(row.content);
      setTplOptions((s) => ({
        ...s,
        context: fromServerContext(row.context),
        theme: opts.theme ?? s.theme,
        container: opts.container ?? s.container,
        card: opts.card ?? s.card,
        applyWrapperToFullHTML: opts.applyWrapperToFullHTML ?? s.applyWrapperToFullHTML,
      }));
    } catch (e) {
      console.error(e);
      showToast("Load failed", "error");
    }
  };

  /* =========== COLLAPSE STATES =========== */
  const [leftOpenInstructions, setLeftOpenInstructions] = useState(true);
  const [leftOpenTokens, setLeftOpenTokens] = useState(true);
  const [leftOpenDefaults, setLeftOpenDefaults] = useState(true);

  const [rightOpenMyTemplates, setRightOpenMyTemplates] = useState(true);
  const [rightOpenImport, setRightOpenImport] = useState(true);
  const [rightOpenUtils, setRightOpenUtils] = useState(true);

  /* =========== copyHTML & downloadHTML =========== */
  const copyHTML = async () => {
    const result = await copyToClipboard(previewHTML);
  if (result === "success") showToast("Copied HTML to clipboard.", "success");
  else showToast("Clipboard blocked — use Download.", "error");
  };

  const downloadHTML = () => {
    const blob = new Blob([previewHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = (title || "template").replace(/[^\w\-]+/g, "-").toLowerCase();
    a.href = url;
    a.download = `${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  showToast("Download started.", "success");
  };

  // (Removed server preview feature per request)

  return (
    <AdminLayout>
    <div className="min-h-screen relative text-gray-900">
      {/* Ambient layered background for depth */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-50 via-white to-blue-50" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.12),transparent_55%)]" />
      {/* Top bar */}
  <header className="sticky top-0 z-10 bg-white/75 backdrop-blur-xl border-b shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
          <FileCode2 className="w-5 h-5" />
          <input
            value={title} onChange={(e)=>{pushHistory(); setTitle(e.target.value);}}
            placeholder="Template title"
            className="text-base font-medium bg-transparent outline-none flex-1"
          />

          {/* Encounter / Portal segmented toggle */}
          <div className="hidden md:flex items-center gap-1 rounded-xl border bg-white p-1 shadow-sm">
            {(["encounter","portal"] as TemplateContext[]).map(opt => (
              <button
                key={opt}
                className={`px-3 py-1.5 text-sm rounded-lg ${tplOptions.context===opt ? "bg-black text-white shadow" : "hover:bg-gray-50"}`}
                onClick={() => setTplOptions(s => ({ ...s, context: opt }))}
                title={`Show ${opt} templates`}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button className={btn} onClick={undo} disabled={!history.length}><Undo2 className="w-4 h-4"/>Undo</button>
            <button className={btn} onClick={redo} disabled={!future.length}><Redo2 className="w-4 h-4"/>Redo</button>
            <button className={btn} onClick={newTemplate}><Plus className="w-4 h-4"/>New</button>
            <button className={btn} onClick={()=>setPreviewOpen(true)}><Eye className="w-4 h-4"/>Preview</button>
            {/* Server preview button removed */}
            <button className={btn} onClick={copyHTML}><Copy className="w-4 h-4"/>Copy</button>
            <button className={btn} onClick={downloadHTML}><Download className="w-4 h-4"/>Download</button>
            <button className={btn} onClick={saveTemplate}><Save className="w-4 h-4"/>Save</button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-4">
        {/* LEFT SIDEBAR */}
        <aside className="col-span-12 md:col-span-3 space-y-3">
          {/* Instructions */}
          <div className={card}>
            <button className="w-full flex items-center justify-between px-3 py-2 border-b bg-gray-50/70 text-sm font-semibold rounded-t-2xl"
              onClick={()=>setLeftOpenInstructions(v=>!v)}>
              <span>Instructions</span>
              <ChevronDown className={`w-4 h-4 transition ${leftOpenInstructions ? "rotate-180" : ""}`} />
            </button>
            {leftOpenInstructions && (
              <div className="p-3">
                <ol className="text-xs space-y-1.5 list-decimal ml-5">
                  <li>Paste raw text or full HTML + CSS into the editor.</li>
                  <li>Use <strong>Tokens</strong> to insert form fields (checkbox, text box, signature, date/time…).</li>
                  <li>Use the top toggle to switch between <strong>Encounter</strong> and <strong>Portal</strong> modes.</li>
                  <li>Only templates for the current mode appear in <strong>My templates</strong>.</li>
                  <li><strong>Save</strong> stores the template to the server; saving again updates it.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Tokens */}
          <div className={card}>
            <button className="w-full flex items-center justify-between px-3 py-2 border-b bg-gray-50/70 text-sm font-semibold"
              onClick={()=>setLeftOpenTokens(v=>!v)}>
              <span>Tokens</span>
              <ChevronDown className={`w-4 h-4 transition ${leftOpenTokens ? "rotate-180" : ""}`} />
            </button>
            {leftOpenTokens && (
              <div className="p-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "{TextInput}","{TextBox}","{TextBox:03x080}","{CheckMark}","{ynRadioGroup}",
                    "{PatientSignature}","{AdminSignature}","{OrgLogo}",
                    '{OrgLogo:"https://example.com/logo.png"}',
                    '{CurrentDate:"global"}',"{CurrentTime}","{DOS}",
                    "{PatientName}","{PatientDOB}","{PatientSex}","{PatientID}","{PatientPhone}",
                    "{Address}","{City}","{State}","{Zip}","{ReferringDOC}"
                  ].map(tok => (
                    <button key={tok} className={pillSm} onClick={()=>insertAtCursor(tok)}>{tok}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Default templates */}
          <div className={card}>
            <button className="w-full flex items-center justify-between px-3 py-2 border-b bg-gray-50/70 text-sm font-semibold"
              onClick={()=>setLeftOpenDefaults(v=>!v)}>
              <span>Default templates</span>
              <ChevronDown className={`w-4 h-4 transition ${leftOpenDefaults ? "rotate-180" : ""}`} />
            </button>
            {leftOpenDefaults && (
              <div className="p-3 grid gap-2">
                <button className={btn} onClick={()=>loadDefault("HIPAA")}>HIPAA Declaration</button>
                <button className={btn} onClick={()=>loadDefault("HELP")}>Help / Pending Forms</button>
                <button className={btn} onClick={()=>loadDefault("INS")}>Insurance Information</button>
                <button className={btn} onClick={()=>loadDefault("PRIV")}>Privacy Practices & Consent</button>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER EDITOR */}
        <section className="col-span-12 md:col-span-6">
          <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.25}} className={`${card} overflow-hidden`}>
            <div className="px-4 py-2 border-b bg-gray-50/70 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Template</h3>
              {/* Mobile context toggle */}
              <div className="md:hidden">
                <div className="inline-flex items-center gap-1 rounded-xl border bg-white p-1 shadow-sm">
                  {(["encounter","portal"] as TemplateContext[]).map(opt => (
                    <button
                      key={opt}
                      className={`px-3 py-1.5 text-sm rounded-lg ${tplOptions.context===opt ? "bg-black text-white shadow" : "hover:bg-gray-50"}`}
                      onClick={() => setTplOptions(s => ({ ...s, context: opt }))}
                      title={`Show ${opt} templates`}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              className="w-full min-h-[560px] outline-none border-0 p-4 font-mono text-sm bg-white"
              value={templateText}
              onChange={(e)=>{pushHistory(); setTemplateText(e.target.value);}}
              placeholder="Type or paste your template…"
            />
            <div className="px-4 py-2 border-t bg-gray-50/70 text-xs text-gray-600 flex items-center justify-between">
              <span>{counts.words} words · {counts.chars} chars</span>
              <span>{currentId ? `Editing saved template (${tplOptions.context})` : `Editing new template (${tplOptions.context})`}</span>
            </div>
          </motion.div>
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="col-span-12 md:col-span-3 space-y-3">
          {/* My templates */}
          <div className={card}>
            <button className="w-full flex items-center justify-between px-3 py-2 border-b bg-gray-50/70 text-sm font-semibold"
              onClick={()=>setRightOpenMyTemplates(v=>!v)}>
              <span>My templates</span>
              <ChevronDown className={`w-4 h-4 transition ${rightOpenMyTemplates ? "rotate-180" : ""}`} />
            </button>
            {rightOpenMyTemplates && (
              <div className="p-3 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                  <input className={`${inputBase} pl-8`} placeholder={`Search ${tplOptions.context} templates…`} value={filter} onChange={(e)=>setFilter(e.target.value)} />
                </div>

                <div className="grid gap-2 max-h-[32vh] overflow-auto">
                  {filteredTemplates.length === 0 && <p className="text-sm text-gray-500">No saved {tplOptions.context} templates yet.</p>}
                  {filteredTemplates.map(t => (
                    <div key={t.id} className="rounded-xl border p-2 bg-white/90 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center gap-2">
                        <button className="text-left flex-1 hover:underline" title="Load" onClick={()=>loadTemplate(t)}>
                          <div className="text-sm font-medium">{t.name}</div>
                          <div className="text[11px] text-gray-500">{new Date(t.updatedAt).toLocaleString()} · {(t.options?.context || "encounter")}</div>
                        </button>
                        <button className={btn} onClick={()=>requestDelete(t)} title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t flex flex-wrap gap-2">
                  <button className={btn} onClick={saveTemplate}>
                    <Save className="w-4 h-4"/>Save
                  </button>
                  <button className={btn} onClick={()=>setPreviewOpen(true)}><Eye className="w-4 h-4"/>Preview</button>
                  {/* Server preview button removed */}
                </div>
              </div>
            )}
          </div>

          {/* Import */}
          <div className={card}>
            <button className="w-full flex items-center justify-between px-3 py-2 border-b bg-gray-50/70 text-sm font-semibold"
              onClick={()=>setRightOpenImport(v=>!v)}>
              <span>Import</span>
              <ChevronDown className={`w-4 h-4 transition ${rightOpenImport ? "rotate-180" : ""}`} />
            </button>
            {rightOpenImport && (
              <div className="p-3 flex flex-col gap-2">
                <label className={btn}>
                  <Upload className="w-4 h-4"/> Import (.html, .htm, .txt, .json)
                  <input hidden type="file" accept=".html,.htm,.txt,.json,application/json" onChange={importAnything}/>
                </label>
                <p className="text-xs text-gray-600">
                  JSON array = creates many on server (assigned to <strong>{tplOptions.context}</strong>). File/text = creates one and loads it.
                </p>
              </div>
            )}
          </div>

          {/* Utils */}
          <div className={card}>
            <button className="w-full flex items-center justify-between px-3 py-2 border-b bg-gray-50/70 text-sm font-semibold"
              onClick={()=>setRightOpenUtils(v=>!v)}>
              <span>Utils</span>
              <ChevronDown className={`w-4 h-4 transition ${rightOpenUtils ? "rotate-180" : ""}`} />
            </button>
            {rightOpenUtils && (
              <div className="p-3 flex flex-wrap gap-2">
                <button className={btn} onClick={trimContent}>Trim</button>
                <button className={btn} onClick={normalizeNewlines}>Normalize</button>
                <button className={btn} onClick={smartToAsciiQuotes}>Smart→ASCII</button>
                <button className={btn} onClick={minifyWhitespace}>Minify</button>
                <button className={btn} onClick={stripHTMLTags}>Strip tags</button>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Toast Notifications */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`px-4 py-2 rounded-xl shadow-lg font-semibold text-sm pointer-events-auto flex items-center gap-2 ${
                t.type === "success" ? "bg-green-600 text-white" : t.type === "error" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
              }`}
              style={{ minWidth: 220 }}
            >
              {t.type === "success" && <Save className="w-4 h-4" />}
              {t.type === "error" && <Trash2 className="w-4 h-4" />}
              {t.type === "info" && <Eye className="w-4 h-4" />}
              <span>{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Preview popup (client-rendered) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-[1100px] h-[86vh] bg-white/95 rounded-2xl shadow-[0_14px_48px_rgba(0,0,0,0.22),0_6px_18px_rgba(0,0,0,0.18)] overflow-hidden border relative">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_70%)]" />
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50/70">
              <div className="flex items-center gap-2"><Eye className="w-4 h-4"/><span className="text-sm font-medium">Live Preview</span></div>
              <button className={btn} onClick={()=>setPreviewOpen(false)}><XIcon className="w-4 h-4"/>Close</button>
            </div>
            <iframe
              title="Live Preview"
              className="w-full h-[calc(86vh-44px)] bg-white"
              sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts"
              srcDoc={previewHTML}
            />
          </div>
        </div>
      )}

      {/* Save dialog - animated modal */}
      <AnimatePresence>
        {saveOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          >
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="w-[min(92vw,520px)] bg-gradient-to-br from-blue-50 to-white rounded-3xl border shadow-2xl overflow-hidden">
              <div className="px-4 py-2 border-b bg-blue-100 text-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2"><Save className="w-4 h-4"/><h3 className="text-base font-bold">Save template</h3></div>
                <button className={btn} onClick={()=>setSaveOpen(false)}><XIcon className="w-4 h-4"/>Close</button>
              </div>
              <div className="p-4 space-y-3">
                <label className="text-xs text-blue-700 font-semibold">Template name</label>
                <input className={inputBase} autoFocus value={saveName} onChange={(e)=>setSaveName(e.target.value)} placeholder="Enter a name…"/>
              </div>
              <div className="px-4 py-3 border-t bg-blue-50 flex items-center justify-end gap-2">
                <button className={btn} onClick={()=>setSaveOpen(false)}>Cancel</button>
                <button
                  className={`${btn} bg-blue-600 text-blue-600 border-blue-600 hover:bg-blue-700 shadow-md`}
                  onClick={()=>{ if (!saveName.trim()) return; performSave(saveName.trim()); }}
                  style={{ fontWeight: 600 }}
                >
                  <Save className="w-4 h-4 text-blue-600"/> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm - animated modal */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          >
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="w-[min(92vw,520px)] bg-gradient-to-br from-red-50 to-white rounded-3xl border shadow-2xl overflow-hidden">
              <div className="px-4 py-2 border-b bg-red-100 text-red-900 flex items-center justify-between">
                <div className="flex items-center gap-2"><Trash2 className="w-4 h-4"/><h3 className="text-base font-bold">Confirm delete</h3></div>
                <button className={btn} onClick={()=>setPendingDelete(null)}><XIcon className="w-4 h-4"/>Close</button>
              </div>
              <div className="p-4 text-sm">
                Are you sure you want to delete <strong>&quot;{pendingDelete.name}&quot;</strong>? This action cannot be undone.
              </div>
              <div className="px-4 py-3 border-t bg-red-50 flex items-center justify-end gap-2">
                <button className={btn} onClick={()=>setPendingDelete(null)}>Cancel</button>
                <button className={`${btn} bg-red-600 text-red-600 border-red-600 hover:bg-red-700`} onClick={performDelete}>
                  <Trash2 className="w-4 h-4"/> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AdminLayout>
  );
}

