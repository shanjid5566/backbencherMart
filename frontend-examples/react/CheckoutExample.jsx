import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import './Checkout.css'; // Add your styles

// Initialize Stripe promise
let stripePromise = null;

const CheckoutExample = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cart, setCart] = useState([]);
    const [formData, setFormData] = useState({
        email: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
        phone: ''
    });

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

    // Initialize Stripe on component mount
    useEffect(() => {
        initStripe();
        loadCart();
    }, []);

    const initStripe = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/payment/config`);
            const { publishableKey } = await response.json();
            stripePromise = loadStripe(publishableKey);
        } catch (err) {
            console.error('Stripe init error:', err);
        }
    };

    const loadCart = async () => {
        const token = localStorage.getItem('authToken');
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/cart`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            setCart(data.items || []);
        } catch (err) {
            setError('Failed to load cart');
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const token = localStorage.getItem('authToken');
        
        if (!token) {
            setError('Please login to continue');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/v1/payment/create-checkout-session`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        metadata: {
                            email: formData.email,
                            shippingAddress: {
                                street: formData.street,
                                city: formData.city,
                                state: formData.state,
                                zip: formData.zip,
                                country: formData.country
                            },
                            phone: formData.phone
                        }
                    })
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Checkout failed');
            }

            const { url, sessionId, orderId } = await response.json();

            // Store for verification
            localStorage.setItem('lastOrderId', orderId);
            localStorage.setItem('lastSessionId', sessionId);

            // Redirect to Stripe
            window.location.href = url;

        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    return (
        <div className="checkout-container">
            <h1>Checkout</h1>

            <div className="checkout-grid">
                {/* Cart Summary */}
                <div className="cart-section">
                    <h2>Order Summary</h2>
                    {cart.length === 0 ? (
                        <p>Your cart is empty</p>
                    ) : (
                        <>
                            {cart.map((item) => (
                                <div key={item._id} className="cart-item">
                                    <div className="item-details">
                                        <div className="item-name">{item.title}</div>
                                        <div className="item-qty">Qty: {item.quantity}</div>
                                    </div>
                                    <div className="item-price">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                            <div className="cart-total">
                                <span className="total-label">Total:</span>
                                <span className="total-amount">
                                    ${calculateTotal().toFixed(2)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Shipping Form */}
                <div className="shipping-section">
                    <h2>Shipping Information</h2>
                    
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Street Address</label>
                            <input
                                type="text"
                                name="street"
                                value={formData.street}
                                onChange={handleInputChange}
                                required
                                placeholder="123 Main St"
                            />
                        </div>

                        <div className="form-group">
                            <label>City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                required
                                placeholder="New York"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>State</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="NY"
                                />
                            </div>

                            <div className="form-group">
                                <label>ZIP</label>
                                <input
                                    type="text"
                                    name="zip"
                                    value={formData.zip}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="10001"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Country</label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                required
                                placeholder="US"
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                required
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>

                        <button
                            type="submit"
                            className="checkout-btn"
                            disabled={loading || cart.length === 0}
                        >
                            {loading ? 'Processing...' : '🔒 Proceed to Payment'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CheckoutExample;
