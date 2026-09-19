import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

(() => {
    const firebaseConfig = {
        apiKey: "AIzaSyC2xPE4YnIanTiRgrwsoXgoclTyOq0BraE",
        authDomain: "tipovacka-fce0e.firebaseapp.com",
        databaseURL: "https://tipovacka-fce0e-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "tipovacka-fce0e"
    };

    const app = initializeApp(firebaseConfig, "ticketSystem");
    const db = getDatabase(app);
    const auth = getAuth(app);
    let currentUid = null;
    let matches = {};
    let player = {};

    const odds = {
        result: { "1": 2, "0": 2, "2": 2, "1X": 1.6, "12": 1.4, "X2": 1.6 },
        score: 4,
        goals: { "V 2.5": 1.3, "V 4.5": 1.6, "V 6.5": 2, "M 2.5": 2, "M 4.5": 1.6, "M 6.5": 1.3 },
        scorer: 3
    };

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
    const activeMatch = (match) => match && match.status === "Plánováno" && match.closed !== true;
    const finishedMatch = (match) => match && (match.status === "Dohráno" || match.status === "Konec");

    function getTicketList() {
        return Object.entries(player.tickets || {}).map(([id, ticket]) => ({ id, ...ticket }));
    }

    function setTicket(id, ticket) {
        return update(ref(db, `tips/${currentUid}/tickets/${id}`), ticket);
    }

    function getOdds(type, pick) {
        if (type === "result" || type === "goals") return odds[type][pick] || 0;
        if (type === "score" || type === "scorer") return odds[type];
        return 0;
    }

    function availableMatches() {
        return Object.entries(matches).filter(([, match]) => activeMatch(match));
    }

    function renderControls() {
        const appUi = document.getElementById("appUI");
        const wallet = appUi?.querySelector(".wallet-card");
        if (!appUi || !wallet || document.getElementById("ticketControls")) return;
        const controls = document.createElement("div");
        controls.id = "ticketControls";
        controls.style.cssText = "display:flex;gap:8px;max-width:500px;margin:15px auto;flex-wrap:wrap;justify-content:center;";
        controls.innerHTML = `
            <button type="button" onclick="window.openTicketCreator()" style="flex:1;min-width:145px;">Založit tiket</button>
            <button type="button" class="btn-alt" onclick="window.showTicketList('active')" style="flex:1;min-width:145px;">Aktivní tikety</button>
            <button type="button" class="btn-alt" onclick="window.showTicketList('history')" style="flex:1;min-width:145px;">Historie tiketů</button>`;
        wallet.insertAdjacentElement("afterend", controls);
    }

    function openModal(title, body) {
        let overlay = document.getElementById("ticketModalOverlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "ticketModalOverlay";
            overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:20000;display:none;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;";
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `<div class="auth-box" style="max-width:600px;width:95%;max-height:90vh;overflow-y:auto;"><h3 style="color:#3b82f6;margin:0 0 15px 0;">${title}</h3>${body}</div>`;
        overlay.style.display = "flex";
        return overlay;
    }

    function closeModal() {
        const overlay = document.getElementById("ticketModalOverlay");
        if (overlay) overlay.style.display = "none";
    }

    window.openTicketCreator = () => {
        if (!currentUid) return alert("Nejdřív se přihlas.");
        const active = getTicketList().filter((ticket) => ticket.status === "active");
        if (active.length >= 3) return alert("Můžeš mít maximálně 3 aktivní tikety.");
        const openMatches = availableMatches();
        if (!openMatches.length) return alert("Momentálně není otevřený žádný zápas.");

        const rows = openMatches.map(([id, match]) => `
            <div style="background:rgba(255,255,255,.05);padding:8px;border-radius:8px;margin-bottom:8px;">
                <b>${escapeHtml(match.home)} - ${escapeHtml(match.away)}</b>
                <select data-ticket-match="${id}" style="margin-top:8px;">
                    <option value="">-- Nevsázet na tento zápas --</option>
                    <option value="result:1">Výsledek 1 (2x)</option><option value="result:0">Výsledek 0 (2x)</option><option value="result:2">Výsledek 2 (2x)</option>
                    <option value="result:1X">Výsledek 1X (1.6x)</option><option value="result:12">Výsledek 12 (1.4x)</option><option value="result:X2">Výsledek X2 (1.6x)</option>
                    <option value="score">Přesné skóre (4x)</option>
                    <option value="goals:V 2.5">Góly V 2.5 (1.3x)</option><option value="goals:V 4.5">Góly V 4.5 (1.6x)</option><option value="goals:V 6.5">Góly V 6.5 (2x)</option>
                    <option value="goals:M 2.5">Góly M 2.5 (2x)</option><option value="goals:M 4.5">Góly M 4.5 (1.6x)</option><option value="goals:M 6.5">Góly M 6.5 (1.3x)</option>
                    <option value="scorer">Střelec (3x)</option>
                </select>
                <input data-ticket-value="${id}" placeholder="Hodnota tipu (např. 3:2 nebo jméno střelce)" style="display:none;margin-top:5px;">
            </div>`).join("");

        const overlay = openModal("Založit tiket", `${rows}<input id="ticketStake" type="number" min="1" placeholder="Vklad (TC)"><div id="ticketTotalOdds" style="color:#6ee7b7;font-weight:bold;margin:10px 0;">Výsledný kurz: 1x</div><div style="display:flex;gap:8px;"><button type="button" class="btn-success" onclick="window.saveTicket()" style="flex:2;">Potvrdit tiket</button><button type="button" class="btn-alt" onclick="window.closeTicketModal()" style="flex:1;">Zavřít</button></div>`);

        overlay.querySelectorAll("select[data-ticket-match]").forEach((select) => {
            select.addEventListener("change", () => {
                const input = overlay.querySelector(`input[data-ticket-value="${select.dataset.ticketMatch}"]`);
                input.style.display = select.value ? "block" : "none";
                if (select.value !== "score" && select.value !== "scorer") input.value = select.value.split(":")[1] || "";
                updateTicketOdds(overlay);
            });
        });
    };

    function updateTicketOdds(overlay) {
        let total = 1;
        overlay.querySelectorAll("select[data-ticket-match]").forEach((select) => {
            if (!select.value) return;
            const [type, pick] = select.value.split(":");
            total *= getOdds(type, pick);
        });
        const output = overlay.querySelector("#ticketTotalOdds");
        if (output) output.innerText = `Výsledný kurz: ${total.toFixed(2)}x | Možná výhra: ${((Number(overlay.querySelector("#ticketStake")?.value) || 0) * total).toFixed(2)} TC`;
    }

    window.saveTicket = async () => {
        if (!currentUid) return;
        const overlay = document.getElementById("ticketModalOverlay");
        const stake = Number(overlay.querySelector("#ticketStake").value);
        const selections = [];
        let totalOdds = 1;
        overlay.querySelectorAll("select[data-ticket-match]").forEach((select) => {
            if (!select.value) return;
            const [type, pick] = select.value.split(":");
            const valueInput = overlay.querySelector(`input[data-ticket-value="${select.dataset.ticketMatch}"]`);
            const value = type === "score" || type === "scorer" ? valueInput.value.trim() : pick;
            if (!value) return;
            const match = matches[select.dataset.ticketMatch];
            const odd = getOdds(type, type === "score" || type === "scorer" ? null : pick);
            totalOdds *= odd;
            selections.push({ matchId: select.dataset.ticketMatch, type, pick: value, odd, home: match.home, away: match.away });
        });
        const currentBalance = Number(player.balance || 0);
        if (!selections.length || !stake || stake <= 0) return alert("Vyber alespoň jeden zápas a zadej platný vklad.");
        if (stake > currentBalance) return alert(`Nedostatek TC! Máš ${currentBalance}.`);
        const activeTickets = getTicketList().filter((ticket) => ticket.status === "active");
        if (activeTickets.length >= 3) return alert("Můžeš mít maximálně 3 aktivní tikety.");
        const ticketId = `t${Date.now()}`;
        await update(ref(db, `tips/${currentUid}`), { balance: currentBalance - stake, [`tickets/${ticketId}`]: { status: "active", createdAt: Date.now(), stake, totalOdds, possibleWin: Math.floor(stake * totalOdds), selections } });
        closeModal();
    };

    window.showTicketList = (type) => {
        const wanted = getTicketList().filter((ticket) => type === "active" ? ticket.status === "active" : ticket.status !== "active");
        const html = wanted.length ? wanted.map((ticket) => `<div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;margin-bottom:8px;"><b>${ticket.status === "active" ? "Aktivní" : "Dokončený tiket"}</b><br>Vklad: ${ticket.stake} TC | Kurz: ${Number(ticket.totalOdds).toFixed(2)}x | Možná výhra: ${ticket.possibleWin} TC<br>${ticket.selections.map((s) => `${escapeHtml(s.home)}-${escapeHtml(s.away)}: ${escapeHtml(s.type === "score" || s.type === "scorer" ? s.pick : s.pick)} (${s.odd}x)`).join("<br>")}${ticket.status === "active" ? `<button class="btn-gold" style="width:100%;margin-top:8px;" onclick="window.cashoutTicket('${ticket.id}')">Cashout (95 %)</button>` : ""}</div>`).join("") : "<p style='color:#94a3b8'>Žádné tikety.</p>";
        openModal(type === "active" ? "Aktivní tikety" : "Historie tiketů", `${html}<button type="button" class="btn-alt" style="width:100%;" onclick="window.closeTicketModal()">Zavřít</button>`);
    };

    window.cashoutTicket = async (ticketId) => {
        const ticket = player.tickets?.[ticketId];
        if (!ticket || ticket.status !== "active") return;
        if (!confirm("Vrátit 95 % vkladu?")) return;
        const refund = Math.floor(Number(ticket.stake) * 0.95);
        await update(ref(db, `tips/${currentUid}`), { balance: Number(player.balance || 0) + refund, [`tickets/${ticketId}/status`]: "cashout", [`tickets/${ticketId}/cashoutAmount`]: refund, [`tickets/${ticketId}/closedAt`]: Date.now() });
        closeModal();
    };

    window.closeTicketModal = closeModal;

    function evaluateTickets() {
        if (!currentUid) return;
        getTicketList().filter((ticket) => ticket.status === "active").forEach(async (ticket) => {
            if (!ticket.selections.every((selection) => finishedMatch(matches[selection.matchId]))) return;
            let won = true;
            ticket.selections.forEach((selection) => {
                const match = matches[selection.matchId];
                const [home, away] = String(match.scoreFullTime || match.score || "0:0").split(":").map(Number);
                const result = home > away ? "1" : home < away ? "2" : "0";
                const goals = home + away;
                if (selection.type === "result") won = won && (selection.pick === result || (selection.pick === "1X" && ["1", "0"].includes(result)) || (selection.pick === "X2" && ["2", "0"].includes(result)) || (selection.pick === "12" && ["1", "2"].includes(result)));
                if (selection.type === "score") won = won && selection.pick === `${home}:${away}`;
                if (selection.type === "goals") won = won && (selection.pick[0] === "V" ? goals > Number(selection.pick.slice(2)) : goals < Number(selection.pick.slice(2)));
                if (selection.type === "scorer") won = won && (matches[selection.matchId].timeline || []).some((event) => event.type === "goal" && event.scorer === selection.pick);
            });
            const payout = won ? Math.floor(Number(ticket.stake) * Number(ticket.totalOdds)) : 0;
            const balance = Number(player.balance || 0) + payout;
            await update(ref(db, `tips/${currentUid}`), { balance, [`tickets/${ticket.id}/status`]: won ? "won" : "lost", [`tickets/${ticket.id}/payout`]: payout, [`tickets/${ticket.id}/closedAt`]: Date.now() });
        });
    }

    onValue(ref(db, "/"), (snapshot) => {
        const data = snapshot.val() || {};
        matches = data.matches || {};
        player = data.tips?.[currentUid] || {};
        renderControls();
        evaluateTickets();
    });

    onAuthStateChanged(auth, (user) => {
        currentUid = user?.uid || null;
        if (currentUid) {
            onValue(ref(db, `tips/${currentUid}`), (snapshot) => {
                player = snapshot.val() || {};
                renderControls();
                evaluateTickets();
            });
        }
    });
})();
