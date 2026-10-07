const web3 = new Web3(
    "https://sepolia.gateway.tenderly.co"
);

const CONTRACT =
    "0x9BA081fA6612456EBba531c95A23d2CC6004190D";

const EVENT_TOPIC =
    "0x0cccf24739c21c35038997818efe2d64fca325679a834c4c5f328b7bfd6e14f5";

const LATEST_REQUESTS = 10;


/*
 * Extract the forgiveness request from the event data.
 */
function extractRequest(data) {

    const hex = data.slice(2);

    const offset = Number(
        BigInt("0x" + hex.slice(0, 64))
    );

    const lengthPosition = offset * 2;

    const length = Number(
        BigInt(
            "0x" +
            hex.slice(
                lengthPosition,
                lengthPosition + 64
            )
        )
    );

    const textStart = lengthPosition + 64;

    const textHex = hex.slice(
        textStart,
        textStart + length * 2
    );

    return web3.utils.hexToUtf8(
        "0x" + textHex
    );
}


async function loadLedger() {

    const ledger =
        document.getElementById("ledger");

    try {

        const latestBlock =
            await web3.eth.getBlockNumber();

        const logs =
            await web3.eth.getPastLogs({
                address: CONTRACT,
                topics: [EVENT_TOPIC],
                fromBlock: 11800000n,
                toBlock: latestBlock
            });

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
                return blockB > blockA ? 1 : -1;
            }

            return Number(b.logIndex) -
                Number(a.logIndex);
        });


        /*
         * Latest ten only.
         */
        const latestLogs =
            logs.slice(
                0,
                LATEST_REQUESTS
            );


        ledger.innerHTML = "";


        if (latestLogs.length === 0) {

            ledger.innerHTML =
                '<p class="ledger-status">' +
                'No forgiveness requests found.' +
                '</p>';

            return;
        }


        /*
         * Display:
         *
         * User: public key
         *
         * Please forgive me for...
         */
        for (const log of latestLogs) {

            const request =
                extractRequest(log.data);

            const entry =
                document.createElement("div");

            entry.className =
                "ledger-entry";


            const text =
                document.createElement("div");

            text.className =
                "ledger-request";

            text.textContent =
                request;


            const user =
                document.createElement("div");

            user.className =
                "ledger-user";

            user.textContent =
                "From user: " + log.topics[1];


            entry.appendChild(text);
            entry.appendChild(user);

            ledger.appendChild(entry);
        }


    } catch (error) {

        console.error(
            "LEDGER ERROR:",
            error
        );

        ledger.innerHTML =
            '<p class="ledger-status">' +
            'Unable to load the forgiveness ledger.' +
            '</p>';
    }
}


loadLedger();
