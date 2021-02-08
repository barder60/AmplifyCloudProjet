import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useReducer, useState } from 'react'
import Button from 'react-bootstrap/Button';
import { API, graphqlOperation } from 'aws-amplify'
import { withAuthenticator } from 'aws-amplify-react'
import { listCoins } from './graphql/queries'
import { createCoin as CreateCoin } from './graphql/mutations'
import { onCreateCoin } from './graphql/subscriptions'
import { Storage } from 'aws-amplify'

import uuid from 'uuid/v4'

const CLIENT_ID = uuid()

const initialState = {
    name: '', price: '', symbol: '', coins: []
}

function reducer(state, action) {
    switch(action.type) {
        case 'SETCOINS':
            return { ...state, coins: action.coins }
        case 'SETINPUT':
            return { ...state, [action.key]: action.value }
        // new 👇
        case 'ADDCOIN':
            return { ...state, coins: [...state.coins, action.coin] }
        default:
            return state
    }
}

function App() {
    const [state, dispatch] = useReducer(reducer, initialState)
    const [imageUrl, updateImage] = useState('')

    useEffect(() => {
        const subscription = API.graphql(graphqlOperation(onCreateCoin)).subscribe({
            next: (eventData) => {
                const coin = eventData.value.data.onCreateCoin
                if (coin.clientId === CLIENT_ID) return
                dispatch({ type: 'ADDCOIN', coin  })
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    async function createCoin() {
        const { name, price, symbol } = state
        if (name === '' || price === '' || symbol === '') return
        const coin = {
            name, price: parseFloat(price), symbol, clientId: CLIENT_ID
        }
        const coins = [...state.coins, coin]
        dispatch({ type: 'SETCOINS', coins })
        console.log('coin:', coin)

        try {
            await API.graphql(graphqlOperation(CreateCoin, { input: coin }))
            console.log('item created!')
        } catch (err) {
            console.log('error creating coin...', err)
        }
    }

    function onChange(e) {
        dispatch({ type: 'SETINPUT', key: e.target.name, value: e.target.value })
    }

    async function fetchImage() {
        const imagePath = await Storage.get('example.png')
        updateImage(imagePath)
    }

    async function loadImage (e) {
        const file = e.target.files[0];
        await Storage.put('example.png', file)
        console.log('image successfully stored!')
    }

    return (
        <div>
            <div>
                <img src={imageUrl} />
                <Button onClick={fetchImage}>Fetch Image</Button>
            </div>
            <input
                type="file" accept='image'
                onChange={(e) => loadImage(e)}
            />
            <input
                name='name'
                placeholder='name'
                onChange={onChange}
                value={state.name}
            />
            <input
                name='price'
                placeholder='price'
                onChange={onChange}
                value={state.price}
            />
            <input
                name='symbol'
                placeholder='symbol'
                onChange={onChange}
                value={state.symbol}
            />
            <Button onClick={createCoin}>Create Coin</Button>
            {
                state.coins.map((c, i) => (
                    <div key={i}>
                        <h2>{c.name}</h2>
                        <h4>{c.symbol}</h4>
                        <p>{c.price}</p>
                    </div>
                ))
            }
        </div>
    )
}

export default withAuthenticator(App, { includeGreetings: true })