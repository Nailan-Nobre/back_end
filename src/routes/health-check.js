app.get("/health", (req, res) => {
  res.status(200).json({
    status: "online",
    time: new Date()
  })
})