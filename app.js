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

const SEPOLIA_CHAIN_ID = "0xaa36a7";

let web3;
let contract;
let account;
let selectedProvider = null;
let selectedWalletName = "";

const wallets = new Map();

const connectButton = document.getElementById("connect");
const accountDisplay = document.getElementById("account");
const networkDisplay = document.getElementById("network");
const form = document.getElementById("request-form");
const status = document.getElementById("status");
const requestField = document.getElementById("requestText");
const donationField = document.getElementById("donation");

const walletMenu = document.createElement("div");
walletMenu.id = "wallet-menu";
walletMenu.style.display = "none";
walletMenu.style.marginTop = "10px";
connectButton.insertAdjacentElement("afterend", walletMenu);

window.addEventListener("eip6963:announceProvider", (event) => {
    const { info, provider } = event.detail;

    if (info && provider && info.rdns) {
        wallets.set(info.rdns, {
            name: info.name || info.rdns,
            provider
        });
    }
});

window.dispatchEvent(new Event("eip6963:requestProvider"));

connectButton.addEventListener("click", showWalletChoices);
form.addEventListener("submit", submitRequest);

async function showWalletChoices() {
    walletMenu.replaceChildren();
    walletMenu.style.display = "block";
    status.textContent = "Looking for available wallets...";

    await new Promise(resolve => setTimeout(resolve, 300));

    if (wallets.size === 0) {
        walletMenu.style.display = "none";
        status.textContent =
            "No compatible wallets were detected. Please check that your wallet extension is installed and enabled, then refresh the page.";
        return;
    }

    status.textContent = "Choose your wallet:";

    for (const wallet of wallets.values()) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = wallet.name;
        button.style.margin = "4px";
        button.addEventListener("click", () => connectWallet(wallet));
        walletMenu.appendChild(button);
    }
}

async function connectWallet(wallet) {
    try {
        status.textContent = "Connecting to " + wallet.name + "...";

        const accounts = await wallet.provider.request({
            method: "eth_requestAccounts"
        });

        if (!accounts || accounts.length === 0) {
            throw new Error("No wallet account was returned.");
        }

        selectedProvider = wallet.provider;
        selectedWalletName = wallet.name;
        account = accounts[0];

        web3 = new Web3(selectedProvider);

        contract = new web3.eth.Contract(
            CONTRACT_ABI,
            CONTRACT_ADDRESS
        );

        accountDisplay.textContent = "Wallet: " + account;
        connectButton.textContent = "Change Wallet";
        walletMenu.style.display = "none";

        const chainId = await selectedProvider.request({
            method: "eth_chainId"
        });

        if (chainId.toLowerCase() !== SEPOLIA_CHAIN_ID) {
            try {
                await selectedProvider.request({
                    method: "wallet_switchEthereumChain",
                    params: [
                        { chainId: SEPOLIA_CHAIN_ID }
                    ]
                });
            } catch (error) {
                if (error.code === 4902) {
                    status.textContent =
                        "Sepolia is not configured in this wallet. Please add the Sepolia network first.";
                    await updateNetwork();
                    return;
                }

                if (error.code === 4001) {
                    status.textContent =
                        "Network switch cancelled. Please switch to Sepolia to continue.";
                    await updateNetwork();
                    return;
                }

                throw error;
            }
        }

        await updateNetwork();

        status.textContent =
            selectedWalletName + " connected.";

        selectedProvider.on?.("accountsChanged", (accounts) => {
            account = accounts[0] || null;
            accountDisplay.textContent = account
                ? "Wallet: " + account
                : "Wallet: Not connected";

            if (!account) {
                status.textContent = "Wallet disconnected.";
            }
        });

        selectedProvider.on?.("chainChanged", updateNetwork);

    } catch (error) {
        console.error(error);
        status.textContent =
            "Could not connect to " + wallet.name + ": " +
            (error.message || error);
    }
}

async function updateNetwork() {
    if (!selectedProvider) return;

    try {
        const chainId = await selectedProvider.request({
            method: "eth_chainId"
        });

        if (chainId.toLowerCase() === SEPOLIA_CHAIN_ID) {
            networkDisplay.textContent = "Network: Sepolia";
        } else {
            networkDisplay.textContent =
                "Network: Not Sepolia (" + chainId + ")";
        }
    } catch (error) {
        console.error(error);
        networkDisplay.textContent =
            "Network: Unable to determine";
    }
}

async function submitRequest(event) {
    event.preventDefault();

    const request = requestField.value;
    const donation = donationField.value;

    if (request === "") {
        window.alert("Please enter some text!");
        requestField.focus();
        return;
    }

    if (request.length <= 500) {
        window.alert("Your request is too short!");
        requestField.focus();
        return;
    }

    if (request.length >= 2000) {
        window.alert("Your request is too long!");
        requestField.focus();
        return;
    }

    if (donation === "" || !Number.isFinite(Number(donation)) ||
        Number(donation) < 0.000001) {
        window.alert("A little more ETH please.");
        donationField.focus();
        return;
    }

    if (!account || !selectedProvider) {
        window.alert("Please connect your wallet first!");
        return;
    }

    try {
        const chainId = await selectedProvider.request({
            method: "eth_chainId"
        });

        if (chainId.toLowerCase() !== SEPOLIA_CHAIN_ID) {
            status.textContent =
                "Please switch your wallet to Sepolia before submitting.";
            return;
        }

        status.textContent =
            "Please confirm the transaction in " + selectedWalletName + "...";

        const value = web3.utils.toWei(donation, "ether");

        const data = contract.methods
            .requestForgiveness(request)
            .encodeABI();

        const transaction = {
            from: account,
            to: CONTRACT_ADDRESS,
            value,
            data
        };

        const txHash = await selectedProvider.request({
            method: "eth_sendTransaction",
            params: [transaction]
        });

        status.innerHTML =
            `Transaction sent! <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" rel="noopener">View on Sepolia Etherscan</a>`;

    } catch (error) {
        console.error(error);
        status.textContent =
            "Error: " + (error.message || error);
    }
}