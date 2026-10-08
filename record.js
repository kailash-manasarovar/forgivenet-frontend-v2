const CONTRACT =
    "0x9BA081fA6612456EBba531c95A23d2CC6004190D";

const EVENT_TOPIC =
    "0x0cccf24739c21c35038997818efe2d64fca325679a834c4c5f328b7bfd6e14f5";

const ETHERSCAN_API_KEY =
    "CR34IBXP3CYVBEWKB5JA32NSBNYTJSZ283";

const LATEST_REQUESTS = 10;


/*
 * Extract the forgiveness request from
 * the blockchain event data.
 */
function extractRequest(data) {

    const hex = data.slice(2);

    const offset = Number(
        BigInt("0x" + hex.slice(0, 64))
    );

    const lengthPosition =
        offset * 2;

    const length = Number(
        BigInt(
            "0x" +
            hex.slice(
                lengthPosition,
                lengthPosition + 64
            )
        )
    );

    const textStart =
        lengthPosition + 64;

    const textHex =
        hex.slice(
            textStart,
            textStart + length * 2
        );

    const bytes =
        new Uint8Array(
            textHex.match(/.{1,2}/g)
                .map(byte => parseInt(byte, 16))
        );

    return new TextDecoder(
        "utf-8"
    ).decode(bytes);
}


/*
 * Create a record.
 */
function createEntry(
    request,
    user,
    date,
    isExample = false,
    transactionHash = null
) {

    const entry =
        document.createElement("div");

    entry.className =
        "record-entry";


    const text =
        document.createElement("div");

    text.className =
        "record-request";

    text.textContent =
        request;


    const details =
        document.createElement("div");

    details.className =
        "record-user";

    details.textContent =
        "From user: " +
        user +
        "  |  " +
        date;


    /*
     * Add Etherscan transaction link
     * to genuine blockchain requests.
     */
    if (
        !isExample &&
        transactionHash
    ) {

        details.appendChild(
            document.createTextNode("  |  ")
        );


        const link =
            document.createElement("a");

        link.href =
            "https://sepolia.etherscan.io/tx/" +
            transactionHash;

        link.target =
            "_blank";

        link.rel =
            "noopener";

        link.textContent =
            "View transaction";


        details.appendChild(link);
    }


    /*
     * Mark example requests.
     */
    if (isExample) {

        details.appendChild(
            document.createTextNode(
                "  |  Example"
            )
        );
    }


    entry.appendChild(text);
    entry.appendChild(details);

    return entry;
}


/*
 * Load the example forgiveness requests
 * from the examples folder.
 */
async function loadExamples(record) {

    const examples = [
        {
            file: "examples/detrans-1.txt",
            user: "EXAMPLE-001",
            date: "1 October 2026"
        },
        {
            file: "examples/grooming-gangs-1.txt",
            user: "EXAMPLE-002",
            date: "2 October 2026"
        },
        {
            file: "examples/women.txt",
            user: "EXAMPLE-003",
            date: "3 October 2026"
        }
    ];


    for (const example of examples) {

        try {

            const response =
                await fetch(example.file);

            if (!response.ok) {

                throw new Error(
                    "Could not load " +
                    example.file
                );
            }


            const request =
                await response.text();


            record.appendChild(
                createEntry(
                    request.trim(),
                    example.user,
                    example.date,
                    true
                )
            );

        } catch (error) {

            console.error(
                "EXAMPLE ERROR:",
                example.file,
                error
            );
        }
    }
}


/*
 * Load the real blockchain record.
 */
async function loadRecord() {

    const record =
        document.getElementById("record");

    try {

        const url =
            "https://api.etherscan.io/v2/api" +
            "?chainid=11155111" +
            "&module=logs" +
            "&action=getLogs" +
            "&address=" + CONTRACT +
            "&topic0=" + EVENT_TOPIC +
            "&fromBlock=0" +
            "&toBlock=latest" +
            "&page=1" +
            "&offset=1000" +
            "&apikey=" + ETHERSCAN_API_KEY;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Etherscan HTTP error: " +
                response.status
            );
        }


        const data =
            await response.json();


        console.log(
            "ETHERSCAN RESPONSE:",
            data
        );


        if (
            data.status !== "1" &&
            data.message !== "No records found"
        ) {

            throw new Error(
                data.result ||
                data.message ||
                "Etherscan API error"
            );
        }


        const logs =
            Array.isArray(data.result)
                ? data.result
                : [];


        console.log(
            "FORGIVENET EVENTS:",
            logs.length
        );


        /*
         * Newest first.
         */
        logs.sort((a, b) => {

            const blockA =
                BigInt(a.blockNumber);

            const blockB =
                BigInt(b.blockNumber);

            if (blockA !== blockB) {

                return blockB > blockA
                    ? 1
                    : -1;
            }

            return Number(
                BigInt(b.logIndex) -
                BigInt(a.logIndex)
            );
        });


        /*
         * Latest ten real requests only.
         */
        const latestLogs =
            logs.slice(
                0,
                LATEST_REQUESTS
            );


        record.innerHTML = "";


        /*
         * Display real blockchain requests.
         */
        for (
            const log of latestLogs
        ) {

            const request =
                extractRequest(
                    log.data
                );


            const date =
                new Date(
                    Number(log.timeStamp) *
                    1000
                );


            const formattedDate =
                date.toLocaleDateString(
                    "en-GB",
                    {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );


            record.appendChild(
                createEntry(
                    request,
                    log.topics[1],
                    formattedDate,
                    false,
                    log.transactionHash
                )
            );
        }


        /*
         * Add the three example requests.
         */
        await loadExamples(record);


    } catch (error) {

        console.error(
            "RECORD ERROR:",
            error
        );

        record.innerHTML =
            '<p class="record-status">' +
            'Unable to load the forgiveness record.' +
            '</p>';
    }
}


loadRecord();