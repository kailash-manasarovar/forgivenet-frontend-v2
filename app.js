const CONTRACT_ADDRESS =
    "0x9BA081fA6612456EBba531c95A23d2CC6004190D";

const CONTRACT_ABI = [
    {
        inputs: [
            {
                internalType: "string",
                name: "forgiveness_request",
                type: "string"
            }
        ],
        name: "requestForgiveness",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    }
];

let web3;
let contract;
let account;

const connectButton = document.getElementById("connect");
const accountDisplay = document.getElementById("account");
const form = document.getElementById("request-form");
const status = document.getElementById("status");

connectButton.addEventListener("click", connectWallet);
form.addEventListener("submit", submitRequest);


async function connectWallet() {

    if (!window.ethereum) {
        status.textContent =
            "MetaMask was not found. Please install MetaMask.";
        return;
    }

    try {

        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        account = accounts[0];

        web3 = new Web3(window.ethereum);

        contract = new web3.eth.Contract(
            CONTRACT_ABI,
            CONTRACT_ADDRESS
        );

        accountDisplay.textContent =
            "Connected: " + account;

        status.textContent =
            "Connected to MetaMask.";

    } catch (error) {

        console.error(error);

        status.textContent =
            "Could not connect to MetaMask.";
    }
}


async function submitRequest(event) {

    event.preventDefault();

    const request =
        document.getElementById("requestText").value;

    const donation =
        document.getElementById("donation").value;

    if (!request.trim()) {
        status.textContent =
            "Please enter a request.";
        return;
    }

    if (!donation || Number(donation) <= 0) {
        status.textContent =
            "Please enter a donation amount.";
        return;
    }

    if (!account) {
        status.textContent =
            "Please connect MetaMask first.";
        return;
    }

    try {

        status.textContent =
            "Opening MetaMask...";

        const value =
            web3.utils.toWei(donation, "ether");

        const data =
            contract.methods
                .requestForgiveness(request)
                .encodeABI();

        const transaction = {
            from: account,
            to: CONTRACT_ADDRESS,
            value: value,
            data: data
        };

        const txHash =
            await window.ethereum.request({
                method: "eth_sendTransaction",
                params: [transaction]
            });

        status.innerHTML =
            `Transaction sent! <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">View on Sepolia Etherscan</a>`;

    } catch (error) {

        console.error(error);

        status.textContent =
            "Error: " + (error.message || error);
    }
}