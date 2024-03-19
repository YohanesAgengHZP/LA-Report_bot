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

const slaMapping = {
    sla_1: '1HK',
    sla_3: '3HK',
    sla_7: '7HK',
    sla_14: '14HK'
    // Add more mappings as needed
};

async function fetchDataFromAPI(apiUrl, params) {
    try {
        const response = await axios.post(apiUrl, params);
        return response.data;
    } catch (error) {
        console.error('Error fetching data from API:', error.message);
        throw error;
    }
}

async function fetchDelayedData(apiUrl, params) {
    try {
        const response = await axios.post(apiUrl, params);
        const delayedData = response.data.data.delayed;

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

        return { delayedData, sortedSLAKeys };
    } catch (error) {
        console.error('Error fetching delayed data:', error.message);
        throw error;
    }
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
        const unclosedResponse = await fetchDataFromAPI(apiUrlsOpeninSLA.Unclosed, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const openInSLAResponse = await fetchDataFromAPI(apiUrlsOpeninSLA.OpenInSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const openOutSLAResponse = await fetchDataFromAPI(apiUrlsOpeninSLA.OpenOutSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });

        const unclosedCount = unclosedResponse[0].count_id;
        const openInSLACount = openInSLAResponse[0].count_id;
        const openOutSLACount = openOutSLAResponse[0].count_id;

        const ticketData = `• <b>Ticket - Unclosed : </b>${unclosedCount}\n• <b>Ticket - Open In SLA : </b>${openInSLACount}\n• <b>Ticket - Open Out SLA : </b>${openOutSLACount}\n`;

        // Fetch KIP data
        const { delayedData, sortedSLAKeys } = await fetchDelayedData(apiUrlsKIP.KIPOutSLA, {
            channel: "ALL",
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });

        let kipData = '';
        for (const sla of sortedSLAKeys) {
            const slaKey = slaMapping[sla] || sla;
            kipData += `<b>TOP 3 KIP out of SLA ${slaKey}:</b>\n`;

            const sortedData = Object.entries(delayedData[sla].data).sort((a, b) => b[1] - a[1]);
            const top3Items = sortedData.slice(0, 3);

            top3Items.forEach(item => {
                kipData += `• ${item[0]}: ${item[1]}\n`;
            });
            kipData += '\n';
        }

        // Fetch closing ticket data
        const closedResponse = await fetchDataFromAPI(apiUrlsOutinSLA.Closed, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const closedInSLAResponse = await fetchDataFromAPI(apiUrlsOutinSLA.ClosedInSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });
        const closedOutSLAResponse = await fetchDataFromAPI(apiUrlsOutinSLA.ClosedOutSLA, {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });

        const closedCount = closedResponse[0].count_id;
        const closedInSLACount = closedInSLAResponse[0].count_id;
        const closedOutSLACount = closedOutSLAResponse[0].count_id;

        const closingTicketData = `<b>• Ticket - Closed : </b>${closedCount}\n<b>• Ticket - Closed In SLA : </b>${closedInSLACount}\n<b>• Ticket - Closed Out SLA : </b>${closedOutSLACount}\n`;

        // Construct the report string
        let reportString = `-------------------------------\n<b>Report ${reportDateRange}</b>\n-------------------------------\n`;

        reportString += '\n';
        reportString += ticketData;
        reportString += '\n';
        reportString += '-------------------------------\n';
        reportString += '\n';
        reportString += kipData;
        reportString += '-------------------------------\n\n';
        reportString += closingTicketData;

        // Send the combined report
        bot.sendMessage(chatId, reportString, { parse_mode: 'HTML' });
    } catch (error) {
        bot.sendMessage(chatId, `Error fetching data: ${error.message}`);
    }
}


async function sendDetailsReport() {
    try {
        const { startDate, endDate } = getPreviousDaysDates(30);
        const formattedStartDate = startDate.format('YYYY-MM-DD');
        const formattedEndDate = endDate.format('YYYY-MM-DD');

        let detailsReport = '';

        // Fetch data from the new API using POST method
        const { delayedData, sortedSLAKeys } = await fetchDelayedData(apiUrlsKIP.KIPOutSLA, {
            channel: "ALL",
            start_date: formattedStartDate,
            end_date: formattedEndDate
        });

        for (const sla of sortedSLAKeys) {
            const slaKey = slaMapping[sla] || sla;
            detailsReport += `<b>TOP 3 KIP out of SLA ${slaKey}:</b>\n`;

            const sortedData = Object.entries(delayedData[sla].data).sort((a, b) => b[1] - a[1]);
            const top3Items = sortedData.slice(0, 3);

            for (let i = 0; i < top3Items.length; i++) {
                const [kip, kipValue] = top3Items[i];
                detailsReport += `• ${kip.replace('aging_', 'Aging ')}: ${kipValue}\n`;

                // Display details only for the top 1 KIP
                if (i === 0) {
                    // Fetch data from the first API
                    const response1 = await fetchDataFromAPI(apiAgingKIP.KIPAging, { start_date: formattedStartDate, end_date: formattedEndDate, channel: 'ALL' });
                    const data1 = response1; // Extract the data array from the response

                    // Define aging range counters
                    let aging_3_7 = 0;
                    let aging_8_14 = 0;
                    let aging_15_20 = 0;
                    let aging_21_30 = 0;
                    let aging_greater_30 = 0;

                    for (const item1 of data1) {
                        const kip2 = item1.kip_2;
                        const slaData = delayedData[sla].data;
                        if (kip2 === kip) {
                            // Count items in each aging range
                            aging_3_7 += (item1.aging_3 || 0) + (item1.aging_4 || 0) + (item1.aging_5 || 0) + (item1.aging_6 || 0) + (item1.aging_7 || 0);
                            aging_8_14 += (item1.aging_8 || 0) + (item1.aging_9 || 0) + (item1.aging_10 || 0) + (item1.aging_11 || 0) + (item1.aging_12 || 0) + (item1.aging_13 || 0) + (item1.aging_14 || 0);
                            aging_15_20 += (item1.aging_15 || 0) + (item1.aging_16 || 0) + (item1.aging_17 || 0) + (item1.aging_18 || 0) + (item1.aging_19 || 0) + (item1.aging_20 || 0);
                            aging_21_30 += (item1.aging_21 || 0) + (item1.aging_22 || 0) + (item1.aging_23 || 0) + (item1.aging_24 || 0) + (item1.aging_25 || 0) + (item1.aging_26 || 0) + (item1.aging_27 || 0) + (item1.aging_28 || 0) + (item1.aging_29 || 0) + (item1.aging_30 || 0);

                            // Sum all aging properties greater than 30
                            for (let j = 31; j <= 100; j++) {
                                aging_greater_30 += item1[`aging_${j}`] || 0;
                            }
                        }
                    }

                    // Format the message for the top 1 KIP
                    detailsReport += `<b>Details:</b>\n`;
                    detailsReport += `<b>Aging 3-7:</b> ${aging_3_7}\n`;
                    detailsReport += `<b>Aging 8-14:</b> ${aging_8_14}\n`;
                    detailsReport += `<b>Aging 15-20:</b> ${aging_15_20}\n`;
                    detailsReport += `<b>Aging 21-30:</b> ${aging_21_30}\n`;
                    detailsReport += `<b>Aging >30:</b> ${aging_greater_30}\n`;
                }
            }
            detailsReport += `-------------------------------\n\n`;
        }

        // Send the details report as a separate message
        bot.sendMessage(chatId, detailsReport, { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Error fetching details report:', error.message);
    }
}

// Handle the /start command to send the combined report with the calculated start and end dates once
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Bot is running and will send the combined report.');
    sendCombinedReport(chatId); // Call sendCombinedReport first
    setTimeout(() => {
        sendDetailsReport(chatId); // Call sendDetailsReport after a delay
    }, 1000); // Adjust the delay time as needed (in milliseconds)
});

// Schedule cron job to run the sendCombinedReport function every day at 8 am
cron.schedule('0 8 * * *', () => {
    sendCombinedReport();
});
