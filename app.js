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


const SEPOLIA_CHAIN_ID =
    "0xaa36a7";


let web3;
let contract;
let account;
let metaMaskProvider = null;


/*
 * Find MetaMask using EIP-6963.
 */

window.addEventListener(
    "eip6963:announceProvider",
    (event) => {

        const provider =
            event.detail.provider;

        const info =
            event.detail.info;


        if (
            info &&
            info.rdns === "io.metamask"
        ) {

            metaMaskProvider =
                provider;
        }
    }
);


window.dispatchEvent(
    new Event("eip6963:requestProvider")
);


const connectButton =
    document.getElementById("connect");

const accountDisplay =
    document.getElementById("account");

const networkDisplay =
    document.getElementById("network");

const form =
    document.getElementById("request-form");

const status =
    document.getElementById("status");

const requestField =
    document.getElementById("requestText");


connectButton.addEventListener(
    "click",
    connectWallet
);

form.addEventListener(
    "submit",
    submitRequest
);


async function connectWallet() {

    if (!metaMaskProvider) {

        status.textContent =
            "MetaMask was not found.";

        return;
    }


    try {

        const accounts =
            await metaMaskProvider.request({
                method:
                    "eth_requestAccounts"
            });


        account =
            accounts[0];


        web3 =
            new Web3(metaMaskProvider);


        contract =
            new web3.eth.Contract(
                CONTRACT_ABI,
                CONTRACT_ADDRESS
            );


        accountDisplay.textContent =
            "Wallet: " + account;


        await updateNetwork();


        status.textContent =
            "MetaMask connected.";


    } catch (error) {

        console.error(error);

        status.textContent =
            "Could not connect to MetaMask.";
    }
}


async function updateNetwork() {

    try {

        const chainId =
            await metaMaskProvider.request({
                method:
                    "eth_chainId"
            });


        console.log(
            "Chain ID:",
            chainId
        );


        if (
            chainId.toLowerCase() ===
            SEPOLIA_CHAIN_ID
        ) {

            networkDisplay.textContent =
                "Network: Sepolia";

        } else {

            networkDisplay.textContent =
                "Network: Not Sepolia (" +
                chainId +
                ")";
        }


    } catch (error) {

        console.error(error);

        networkDisplay.textContent =
            "Network: Unable to determine";
    }
}


async function submitRequest(event) {

    event.preventDefault();


    const request =
        requestField.value;


    const donation =
        document
            .getElementById("donation")
            .value;


    /*
    * Request validation.
    */

    if (request === "") {

        window.alert(
            "Please enter some text!"
        );

        requestField.focus();

        return;
    }


    if (request.length <= 500) {

        window.alert(
            "Your request is too short!"
        );

        requestField.focus();

        return;
    }


    if (request.length >= 2000) {

        window.alert(
            "Your request is too long!"
        );

        requestField.focus();

        return;
    }

    /*
    * Donation validation.
    */

    if (donation < 0.000001)
        /* PRODUCTION if (donation.value <= 0.01) */ {
        window.alert("A little more ETH please.");
        donation.focus();
        return false;
    }

    /*
     * Wallet validation.
     */

    if (!account) {

        status.textContent =
            window.alert("Please connect your MetaMask wallet first!");

        return;
    }


    try {

        status.textContent =
            "Opening MetaMask...";


        const value =
            web3.utils.toWei(
                donation,
                "ether"
            );


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
            await metaMaskProvider.request({

                method:
                    "eth_sendTransaction",

                params:
                    [transaction]
            });


        status.innerHTML =
            `Transaction sent! <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" rel="noopener">View on Sepolia Etherscan</a>`;


    } catch (error) {

        console.error(error);

        status.textContent =
            "Error: " +
            (error.message || error);
    }


}