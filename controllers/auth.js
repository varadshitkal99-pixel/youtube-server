import User from '../models/auth.js'; 

export const login = async (req, res) => {
    const { email, name, image } = req.body;

    try {
    
        const user = await User.findOne({ email });

        if (!user) {
            // 2. If user doesn't exist, create and save them
            const newUser = new User({ name, email, image });
            await newUser.save(); // ✅ IMPORTANT: This actually saves the user to MongoDB!
            
            res.status(201).json({ result: newUser });
        } else {
            // 3. If user exists, log them in
            res.status(200).json({ result: user }); // 
        }
    } catch (error) {
        // ✅ Only one catch block needed
        console.error(error); 
        res.status(500).json({ message: "Something went wrong" });
    }
};