const web3 = new Web3(
    "https://sepolia.gateway.tenderly.co"
);

const CONTRACT =
    "0x9BA081fA6612456EBba531c95A23d2CC6004190D";

const EVENT_TOPIC =
    "0x0cccf24739c21c35038997818efe2d64fca325679a834c4c5f328b7bfd6e14f5";

const LATEST_REQUESTS = 10;

async function loadLedger() {
    const ledger = document.getElementById("ledger");

    try {
        const latestBlock = await web3.eth.getBlockNumber();

        const logs = await web3.eth.getPastLogs({
            address: CONTRACT,
            topics: [EVENT_TOPIC],
            fromBlock: 11800000n,
            toBlock: latestBlock
        });

        console.log("FORGIVENET EVENTS:", logs.length);

        const latestLogs = logs
            .sort((a, b) =>
                Number(b.blockNumber - a.blockNumber)
            )
            .slice(0, LATEST_REQUESTS);

        ledger.innerHTML = "";

        if (latestLogs.length === 0) {
            ledger.innerHTML =
                '<p class="ledger-status">No forgiveness requests found.</p>';
            return;
        }

        for (const log of latestLogs) {

            const decoded =
                web3.eth.abi.decodeParameters(
                    ["string"],
                    log.data
                );

            const entry = document.createElement("div");

            entry.className = "ledger-entry";
            entry.textContent = decoded[0];

            ledger.appendChild(entry);
        }

    } catch (error) {
        console.error("LEDGER ERROR:", error);

        ledger.innerHTML =
            '<p class="ledger-status">Unable to load the forgiveness ledger.</p>';
    }
}

loadLedger();