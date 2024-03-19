'use strict';

require('dotenv').config();

const axios = require('axios');
const moment = require('moment');
process.env.TZ = 'Asia/Jakarta';

const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const chatId = process.env.CHAT_ID; // Replace with the actual chat ID

// Manually specified API URLs
const apiUrlsOpeninSLA = {
    Unclosed: process.env.API_Unclosed,
    OpenInSLA: process.env.API_OpenInSLA,
    OpenOutSLA: process.env.API_OpenOutSLA,
};

const apiUrlsOutinSLA = {
    Closed: process.env.API_Closed,
    ClosedInSLA: process.env.API_ClosedInSLA,
    ClosedOutSLA: process.env.API_ClosedOutSLA
}

const apiUrlsKIP = {
    KIPOutSLA: process.env.API_KIPOutSLA
}

const apiAgingKIP = {
    KIPAging: process.env.API_AgingOpenOut
}

function getPreviousDaysDates(days) {
    const endDate = moment().subtract(1, 'days').endOf('day');
    const startDate = moment('2024-01-01');
    return { startDate, endDate };
}

async function sendCombinedReport() {
    try {
        const { startDate, endDate } = getPreviousDaysDates(30);

        const startDateFormat = startDate.format('D MMM YYYY');
        const endDateFormat = endDate.format('D MMM YYYY');
        const reportDateRange = `${startDateFormat} - ${endDateFormat}`;

        const formattedStartDate = startDate.format('YYYY-MM-DD');
        const formattedEndDate = endDate.format('YYYY-MM-DD');

        // Fetch ticket data
        const unclosedResponse = await axios.post(apiUrlsOpeninSLA.Unclosed, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const openInSLAResponse = await axios.post(apiUrlsOpeninSLA.OpenInSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const openOutSLAResponse = await axios.post(apiUrlsOpeninSLA.OpenOutSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });

        const unclosedCount = unclosedResponse.data.data[0].count_id;
        const openInSLACount = openInSLAResponse.data.data[0].count_id;
        const openOutSLACount = openOutSLAResponse.data.data[0].count_id;

        const ticketData = `• <b>Ticket - Unclosed : </b>${unclosedCount}\n• <b>Ticket - Open In SLA : </b>${openInSLACount}\n• <b>Ticket - Open Out SLA : </b>${openOutSLACount}\n`;

        // Fetch KIP data
        let kipData = '';

        // Fetch data from the new API using POST method
        const kipResponse = await axios.post(apiUrlsKIP.KIPOutSLA, {
            channel: "ALL",
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });

        const delayedData = kipResponse.data.data.delayed;

        const slaMapping = {
            sla_1: '1HK',
            sla_3: '3HK',
            sla_7: '7HK',
            sla_14: '14HK'
            // Add more mappings as needed
        };

        // Custom sorting function to sort SLA keys like "1HK", "3HK", "7HK", "14HK", etc.
        const customSort = (a, b) => {
            const keyA = slaMapping[a] || a;
            const keyB = slaMapping[b] || b;
            const numA = parseInt(keyA.match(/\d+/)[0]);
            const numB = parseInt(keyB.match(/\d+/)[0]);

            if (numA < numB) return 1; // Sort higher numbers first
            if (numA > numB) return -1;
            return 0;
        };

        // Sort the SLA keys using the custom sort function
        const sortedSLAKeys = Object.keys(delayedData)
            .filter(sla => sla !== 'sla_7') // Exclude 'sla_7'
            .sort(customSort);

        for (const sla of sortedSLAKeys) {
            const slaKey = slaMapping[sla] || sla;
            kipData += `<b>TOP 3 KIP out of SLA ${slaKey}:\n</b>`;

            const sortedData = Object.entries(delayedData[sla].data).sort((a, b) => b[1] - a[1]);
            const top3Items = sortedData.slice(0, 3);

            top3Items.forEach(item => {
                kipData += `• ${item[0]}: ${item[1]}\n`;
            });
            kipData += '\n';
        }

        // Fetch closing ticket data
        const closedResponse = await axios.post(apiUrlsOutinSLA.Closed, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const closedInSLAResponse = await axios.post(apiUrlsOutinSLA.ClosedInSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const closedOutSLAResponse = await axios.post(apiUrlsOutinSLA.ClosedOutSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });

        const closedCount = closedResponse.data.data[0].count_id;
        const closedInSLACount = closedInSLAResponse.data.data[0].count_id;
        const closedOutSLACount = closedOutSLAResponse.data.data[0].count_id;

        const closingTicketData = `<b>• Ticket - Closed : </b>${closedCount}\n<b>• Ticket - Closed In SLA : </b>${closedInSLACount}\n<b>• Ticket - Closed Out SLA : </b>${closedOutSLACount}\n`;

        // Construct the report string
        let reportString = `-------------------------------\n<b>Report ${reportDateRange}</b>\n-------------------------------\n`;

        // Add ticket data to the report
        reportString += '\n';
        reportString += ticketData;
        reportString += '\n';
        reportString += '-------------------------------\n';

        // Add KIP data to the report
        reportString += '\n';
        reportString += kipData;

        // Add closing ticket data to the report
        reportString += '-------------------------------\n';
        reportString += '\n';
        reportString += closingTicketData;

        // Send the combined report
        bot.sendMessage(chatId, reportString, { parse_mode: 'HTML' });
    } catch (error) {
        bot.sendMessage(chatId, `Error fetching data: ${error.message}`);
    }
}
 
async function top3DetailsReport() {
    try {
        const { startDate, endDate } = getPreviousDaysDates(30);

        const startDateFormat = startDate.format('D MMM YYYY');
        const endDateFormat = endDate.format('D MMM YYYY');
        const reportDateRange = `${startDateFormat} - ${endDateFormat}`;

        const formattedStartDate = startDate.format('YYYY-MM-DD');
        const formattedEndDate = endDate.format('YYYY-MM-DD');

        // Fetch data from the API
        const response = await axios.post(apiAgingKIP.KIPAging, {
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            channel: 'ALL'
        });
        const data = response.data.data;

        // Sort the data based on the total_ticket field
        data.sort((a, b) => b.total_ticket - a.total_ticket);

        let top3Report = '';
        top3Report += `-------------------------------\n`
        top3Report += `<b>Aging cluster for ticket open out of SLA </b>\n`;
        top3Report += `<b>${reportDateRange}</b>\n`;
        top3Report += `-------------------------------\n\n`

        // Display the top 3 entries
        for (let i = 0; i < Math.min(data.length, 3); i++) {
            const entry = data[i];
            top3Report += `<b> • ${entry.kip_2}</b>\n`;
            top3Report += `Total Tickets: ${entry.total_ticket}\n`;

            // Define aging range counters
            let aging_3_7 = 0;
            let aging_8_14 = 0;
            let aging_15_20 = 0;
            let aging_21_30 = 0;
            let aging_greater_30 = 0;

            // Calculate aging details for the top 1 KIP
            for (let j = 3; j <= 7; j++) {
                aging_3_7 += entry[`aging_${j}`] || 0;
            }
            for (let j = 8; j <= 14; j++) {
                aging_8_14 += entry[`aging_${j}`] || 0;
            }
            for (let j = 15; j <= 20; j++) {
                aging_15_20 += entry[`aging_${j}`] || 0;
            }
            for (let j = 21; j <= 30; j++) {
                aging_21_30 += entry[`aging_${j}`] || 0;
            }
            for (let j = 31; j <= 100; j++) {
                aging_greater_30 += entry[`aging_${j}`] || 0;
            }

            // Format the aging details
            top3Report += `<b>Details :</b>\n`;
            top3Report += `Aging 3-7 : ${aging_3_7}\n`;
            top3Report += `Aging 8-14 : ${aging_8_14}\n`;
            top3Report += `Aging 15-20 : ${aging_15_20}\n`;
            top3Report += `Aging 21-30 : ${aging_21_30}\n`;
            top3Report += `Aging >30 : ${aging_greater_30}\n\n`;
        }

        // Send the top 3 report as a message
        bot.sendMessage(chatId, top3Report, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Error fetching top 3 details report:', error.message);
    }
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Bot is running and will send the combined report.');
    sendCombinedReport(chatId); 
    setTimeout(() => {
        // sendDetailsReport(chatId);
        top3DetailsReport(chatId) 
    }, 10000); 
});


// Schedule cron job to run the sendCombinedReport function every day at 8 am
cron.schedule('0 8 * * *', () => {
    sendCombinedReport(); 
    setTimeout(() => {
        // sendDetailsReport(chatId);
        top3DetailsReport() 
    }, 10000);
});
