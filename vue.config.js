if (process.env.NODE_ENV === 'debug') {
    module.exports = {
        publicPath: '/'
    }
} else {
    module.exports = {
        publicPath: `./`
    }
}
