
const axios = require('axios');
const fs = require('fs');

module.exports = {
    name: 'track',
    aliases: ['flight'],
    description: 'Tracks Flights And Sends Updates.',
    roles: ['modeer'],
    execute: async(client, message, args) => {
        if(args.length <= 0) return await client.reply(message.from,"You must specify a flight number.",message.id)
        let flightNumber = args[0].toUpperCase()
        const flightsJson = JSON.parse(fs.readFileSync(`${__dirname}/flights.json`))
        let oldNumbers = []
        if (flightNumber in flightsJson) {
            console.log("Flight Already Being Tracked! Adding Phone Number To List..")
            oldNumbers = flightsJson[flightNumber].numbers
        }
        if (!(oldNumbers.includes(message.from))) oldNumbers.push(message.from)
        const flightIdResponse = await getFlightId(flightNumber)

        if (!flightIdResponse.success) {
            console.log("Failed To Fetch Flight Details")
            return await client.reply(message.from, flightIdResponse.apiResponseMessage, message.id)
        }

        const flightDetailsResponse = await getFlightDetails(flightIdResponse.flightId,true,oldNumbers)


        const newDetails = flightDetailsResponse.flightDetails
        let replyText =  `🚨 TRACKING FLIGHT 🚨\n\n✈️ Flight No.: ${newDetails.flightNumber}\n🌎 Route: ${newDetails.departureAirport} -> ${newDetails.arrivalAirport}\n🛫 Departure: ${newDetails.departureTime}\n⏰ Scheduled Arrival: ${newDetails.scheduledArrival}\n🛬 Estimated Arrival: ${newDetails.estimatedArrival}\n📡 Status: ${newDetails.flightStatus.toUpperCase()}`
        console.log(replyText)
        await client.reply(message.from,replyText, message.id)


        },
    checkFlights: async(client)=>{
        const flightsJson = JSON.parse(fs.readFileSync(`${__dirname}/flights.json`))

        // console.log(flightsJson)
        for (var flightNumber in flightsJson) {
            if (flightsJson[flightNumber].flightStatus.toUpperCase().includes("LANDED")) {
                console.log("Skipping " + flightNumber + "...")
                continue
            }
    
            const oldDetails = flightsJson[flightNumber]
    
            const flightIdResponse = await getFlightId(flightNumber)
    
            if (!flightIdResponse.success) {
                console.log("Failed To Fetch Flight Id")
                continue 
            }
    
            const flightDetailsResponse = await getFlightDetails(flightIdResponse.flightId,true,oldDetails.numbers)
    
    
    
            if (!flightDetailsResponse.success) {
                console.log("Failed To Fetch Flight Details")
                    // Send Error
                continue
            }
            const newDetails = flightDetailsResponse.flightDetails
            if (newDetails.departureTime != oldDetails.departureTime || newDetails.estimatedArrival != oldDetails.estimatedArrival || newDetails.flightStatus != oldDetails.flightStatus) {
                let updateText = `🚨 FLIGHT UPDATE DETECTED 🚨\n\n✈️ Flight No.: ${newDetails.flightNumber}\n🌎 Route: ${newDetails.departureAirport} -> ${newDetails.arrivalAirport}\n🛫 Departure: ${newDetails.departureTime}\n⏰ Scheduled Arrival: ${newDetails.scheduledArrival}\n⌚️ Estimated Arrival: ${newDetails.estimatedArrival}\n📡 Status: ${newDetails.flightStatus.toUpperCase()}`
    
                for (var i = 0; i < newDetails.numbers.length; i++) {
                    await client.sendText(newDetails.numbers[i], updateText)
                }
    
            }
    
    
    
        }
    },
};

async function getFlightId(flightNumber) {
    let apiResponseMessage;
    let flightId;
    let success;
    await axios.get("https://www.flightradar24.com/v1/search/web/find?limit=10&query=" + flightNumber)
        .then((response) => {
            if (response.status != 200) {
                success = false
                apiResponseMessage = "getFlightId API returned status code: " + response.status
                console.log("getFlightId API returned status code: " + response.status)
                return
            }
  
            let flights = response.data.results.filter((result) => result.type == "live" && result.detail.flight == flightNumber.toUpperCase())
       
            if (flights.length <= 0) {
                success = false
                apiResponseMessage = "No Flights Found"
                return
            }
            success = true;
            flightId = flights[0].id
        })
        .catch((error) => {
            console.error("getFlightId Error: ", error);
            success = false
            apiResponseMessage = "getFlightId Axios caught an error: " + error
            return

        });
    return { success, apiResponseMessage, flightId }

}
async function getFlightDetails(flightId, writeToFile, numbers) {
    let flightDetails = { flightNumber: null, departureTime: null, departureAirport: null, arrivalAirport: null, scheduledArrival: null, estimatedArrival: null, flightStatus: null, flightMessage: null, numbers }
    let apiResponseMessage;
    let success;
    await axios.get("https://data-live.flightradar24.com/clickhandler/?version=1.5&flight=" + flightId)
        .then((response) => {
            if (response.status != 200) {
                success = false
                apiResponseMessage = "API returned status code: " + response.status
                return
            }
    
            success = true
            const flight = response.data
            apiResponseMessage = "Successfully Found Flight!"
            flightDetails.flightNumber = flight.identification.number.default
            flightDetails.flightMessage = flight.status.text
            flightDetails.departureAirport = flight.airport.origin.code.iata
            flightDetails.arrivalAirport = flight.airport.destination.code.iata
        
            flightDetails.departureTime = flight.time.real.departure ?? flight.time.scheduled.departure
            flightDetails.scheduledArrival = flight.time.scheduled.arrival
            flightDetails.estimatedArrival = flight.time.real.arrival ?? flight.time.estimated.arrival
            flightDetails.departureTime = convertTimestamp(flightDetails.departureTime)
            flightDetails.scheduledArrival = convertTimestamp(flightDetails.scheduledArrival)
            flightDetails.estimatedArrival = convertTimestamp(flightDetails.estimatedArrival)

            flightDetails.flightStatus = flight.time.real.arrival != null? `Landed at ${flightDetails.estimatedArrival}`: flightDetails.flightMessage

            return
        })
        .catch((error) => {

            console.error("Error: ", error);
            success = false
            apiResponseMessage = "Axios caught an error: " + error
            return
        });

    if (writeToFile && success) {
        try {
            const flightsJson = JSON.parse(fs.readFileSync(`${__dirname}/flights.json`))
            flightsJson[flightDetails.flightNumber] = flightDetails
            fs.writeFileSync(`${__dirname}/flights.json`, JSON.stringify(flightsJson));
        } catch (err) {
            console.error('Add To Flights Json Error:', err)

            apiResponseMessage = 'Failed To Add To Json File'
        }
    }

    return { success, apiResponseMessage, flightDetails };
}
function convertTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
  
    const formattedTime = `${hours}:${minutes} - ${day}/${month}`;
    return formattedTime;
  }


  
