import ChatSession from "./chatSession.model.js";
import Appointment from "../appointment/appointment.model.js";
import Doctor from "../doctor/doctor.model.js";
import Service from "../service/service.model.js";
import { runRagChain, runRagChainStream } from "../../rag/chain/ragChain.js";
import { computeDoctorAvailability } from "../schedule/schedule.controller.js";

const normalizeText = (value = "") => value
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

export const classifyChatIntent = (message = "") => {
    const text = normalizeText(message);
    const wantsDoctorInfo = /(co bac si nao|danh sach bac si|doi ngu bac si|bac si nao|thong tin bac si|bac si.*khong|bs.*khong)/.test(text);
    const wantsServiceInfo = /(bang gia|gia dich vu|dich vu|chi phi|nieng rang|implant|e-max|emax|tay trang|nho rang|tram rang|boc rang)/.test(text);
    const bookingAction = /(dat lich|dat hen|kiem tra lich|check lich|xem lich|con cho|con slot|con lich|trong lich|lich trong|slot trong|con trong)/.test(text);
    const specificDate = /(hom nay|ngay mai|sang mai|chieu mai|toi mai|mai|tuan toi|thu 2|thu hai|thu 3|thu ba|thu 4|thu tu|thu 5|thu nam|thu 6|thu sau|thu 7|thu bay|chu nhat|cn|t2|t3|t4|t5|t6|t7|\b\d{1,2}[/-]\d{1,2})/.test(text);
    const specificPeriod = /(sang|buoi sang|chieu|buoi chieu|toi|buoi toi|morning|afternoon|evening)/.test(text);
    const doctorNameHint = /(bac si|bs)\s+[a-zA-ZÀ-ỹ]{2,}/i.test(message) && !/(bac si nao|danh sach bac si|doi ngu bac si)/.test(text);
    const hasSpecificEntities = specificDate || specificPeriod || doctorNameHint;

    if (bookingAction && hasSpecificEntities && (wantsDoctorInfo || wantsServiceInfo)) {
        return { intent: "MIXED", wantsDoctorInfo, wantsServiceInfo, bookingAction, hasSpecificEntities };
    }
    if (bookingAction && hasSpecificEntities) {
        return { intent: "BOOKING_CHECK", wantsDoctorInfo, wantsServiceInfo, bookingAction, hasSpecificEntities };
    }
    return { intent: "QUERY_INFO", wantsDoctorInfo, wantsServiceInfo, bookingAction, hasSpecificEntities };
};
