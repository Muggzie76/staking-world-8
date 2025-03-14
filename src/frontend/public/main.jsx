import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/nft_staking_backend/index';
import { motion, AnimatePresence } from 'framer-motion';

// Components
const NFTCard = ({ nft, onStake, onUnstake, isStaked = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105"
            whileHover={{ y: -5 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
        >
            <div className="aspect-square relative">
                <img
                    src={`https://picsum.photos/400/400?random=${nft.id}`}
                    alt={`NFT #${nft.id}`}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <div className="p-4">
                <h3 className="text-xl font-bold mb-2">NFT #{nft.id}</h3>
                <p className="text-gray-400 text-sm mb-4">{nft.metadata}</p>
                {isStaked && (
                    <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                        <span className="text-green-400 text-sm">Currently Staked</span>
                    </div>
                )}
                <motion.button
                    onClick={() => isStaked ? onUnstake(nft.id) : onStake(nft.id)}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                        isStaked
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    whileTap={{ scale: 0.95 }}
                >
                    {isStaked ? 'Unstake' : 'Stake'}
                </motion.button>
            </div>
            {isStaked && (
                <div className="absolute top-3 right-3">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Earning Rewards
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const StatsCard = ({ title, value, icon, change }) => (
    <motion.div
        className="bg-gray-800 rounded-xl p-6 shadow-lg"
        whileHover={{ y: -5 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
    >
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">{title}</h3>
            <span className="text-gray-500">{icon}</span>
        </div>
        <div className="flex items-end justify-between">
            <div>
                <p className="text-3xl font-bold">{value}</p>
                {change && (
                    <p className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
                    </p>
                )}
            </div>
        </div>
    </motion.div>
);

const App = () => {
    const [authClient, setAuthClient] = useState(null);
    const [actor, setActor] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userNFTs, setUserNFTs] = useState([]);
    const [stakedNFTs, setStakedNFTs] = useState([]);
    const [rewards, setRewards] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        initAuth();
    }, []);

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const initAuth = async () => {
        try {
            const client = await AuthClient.create();
            setAuthClient(client);

            if (await client.isAuthenticated()) {
                handleAuthenticated(client);
            }
        } catch (error) {
            console.error('Auth initialization failed:', error);
            showNotification('Failed to initialize authentication', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthenticated = async (client) => {
        try {
            const identity = await client.getIdentity();
            const agent = new HttpAgent({ identity });
            const actor = Actor.createActor(idlFactory, {
                agent,
                canisterId: process.env.NFT_STAKING_BACKEND_CANISTER_ID,
            });

            setActor(actor);
            setIsAuthenticated(true);
            await loadUserData(actor);
        } catch (error) {
            console.error('Authentication failed:', error);
            showNotification('Authentication failed', 'error');
        }
    };

    const login = async () => {
        try {
            await authClient?.login({
                identityProvider: process.env.II_URL,
                onSuccess: () => handleAuthenticated(authClient),
            });
        } catch (error) {
            console.error('Login failed:', error);
            showNotification('Login failed', 'error');
        }
    };

    const logout = async () => {
        try {
            await authClient?.logout();
            setIsAuthenticated(false);
            setUserNFTs([]);
            setStakedNFTs([]);
            setRewards(0);
            showNotification('Successfully logged out', 'success');
        } catch (error) {
            console.error('Logout failed:', error);
            showNotification('Logout failed', 'error');
        }
    };

    const loadUserData = async (actor) => {
        try {
            setIsLoading(true);
            const result = await actor.getUserStakes();
            switch (result.tag) {
                case 'ok':
                    setStakedNFTs(result.val.stakedNFTs);
                    setRewards(result.val.totalRewards);
                    break;
                case 'err':
                    console.error('Error loading user data:', result.val);
                    showNotification('Failed to load user data', 'error');
                    break;
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to load user data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const stakeNFT = async (nftId) => {
        try {
            setIsLoading(true);
            const result = await actor.stakeNFT(nftId);
            if (result.tag === 'ok') {
                await loadUserData(actor);
                showNotification('NFT staked successfully', 'success');
            } else {
                showNotification('Failed to stake NFT', 'error');
            }
        } catch (error) {
            console.error('Error staking NFT:', error);
            showNotification('Failed to stake NFT', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const unstakeNFT = async (nftId) => {
        try {
            setIsLoading(true);
            const result = await actor.unstakeNFT(nftId);
            if (result.tag === 'ok') {
                await loadUserData(actor);
                showNotification('NFT unstaked successfully', 'success');
            } else {
                showNotification('Failed to unstake NFT', 'error');
            }
        } catch (error) {
            console.error('Error unstaking NFT:', error);
            showNotification('Failed to unstake NFT', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const claimRewards = async () => {
        try {
            setIsLoading(true);
            const result = await actor.claimRewards();
            if (result.tag === 'ok') {
                await loadUserData(actor);
                showNotification(`Successfully claimed ${result.val} rewards`, 'success');
            } else {
                showNotification('Failed to claim rewards', 'error');
            }
        } catch (error) {
            console.error('Error claiming rewards:', error);
            showNotification('Failed to claim rewards', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
                            notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                        }`}
                    >
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <img src="/logo.png" alt="Logo" className="h-10 w-10" />
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                Staking World 8
                            </h1>
                        </div>
                        {!isAuthenticated ? (
                            <motion.button
                                onClick={login}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105"
                                whileTap={{ scale: 0.95 }}
                            >
                                Connect Wallet
                            </motion.button>
                        ) : (
                            <motion.button
                                onClick={logout}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105"
                                whileTap={{ scale: 0.95 }}
                            >
                                Disconnect
                            </motion.button>
                        )}
                    </div>
                </div>
            </header>

            {isAuthenticated && (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <StatsCard
                            title="Total Staked NFTs"
                            value={stakedNFTs.length}
                            icon="🎨"
                            change={10}
                        />
                        <StatsCard
                            title="Available Rewards"
                            value={rewards}
                            icon="🏆"
                            change={5}
                        />
                        <StatsCard
                            title="Total Value Locked"
                            value={`${stakedNFTs.length * 100} ICP`}
                            icon="💎"
                            change={15}
                        />
                    </div>

                    {/* Rewards Section */}
                    <div className="bg-gray-800/50 rounded-2xl p-8 mb-12 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Your Rewards</h2>
                                <p className="text-gray-400">Stake your NFTs to earn more rewards</p>
                            </div>
                            <motion.button
                                onClick={claimRewards}
                                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg disabled:opacity-50"
                                disabled={rewards === 0}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Claim Rewards
                            </motion.button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-700/50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold mb-4">Staking Rewards</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Current Rate</span>
                                    <span className="text-2xl font-bold">1.5% / day</span>
                                </div>
                            </div>
                            <div className="bg-gray-700/50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold mb-4">Your Earnings</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Total Earned</span>
                                    <span className="text-2xl font-bold">{rewards} Tokens</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NFT Grid */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Your NFTs</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {userNFTs.map((nft) => (
                                    <NFTCard
                                        key={nft.id}
                                        nft={nft}
                                        onStake={stakeNFT}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-6">Staked NFTs</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {stakedNFTs.map((stakedNFT) => (
                                    <NFTCard
                                        key={stakedNFT.nft.id}
                                        nft={stakedNFT.nft}
                                        onUnstake={unstakeNFT}
                                        isStaked={true}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* Footer */}
            <footer className="bg-gray-800/30 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">About</h3>
                            <p className="text-gray-400">
                                Staking World 8 is a next-generation NFT staking platform on the Internet Computer.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a href="#" className="text-gray-400 hover:text-white">
                                        Documentation
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-400 hover:text-white">
                                        FAQ
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-400 hover:text-white">
                                        Support
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Community</h3>
                            <div className="flex space-x-4">
                                <a href="#" className="text-gray-400 hover:text-white">
                                    Twitter
                                </a>
                                <a href="#" className="text-gray-400 hover:text-white">
                                    Discord
                                </a>
                                <a href="#" className="text-gray-400 hover:text-white">
                                    Telegram
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-700">
                        <p className="text-center text-gray-400">
                            © 2024 Staking World 8. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);