import { createFAQ, deleteFAQ, getFAQsByProductId, updateFAQ } from "../services/faqService.js";


// controller to get FAQs by product ID 

export const getFAQsByProductIdController = async (req, res) => {
  const { productId } = req.params;
  const { page, limit, sort, fields } = req.query;
  try {
    const result = await getFAQsByProductId({ productId, page, limit, sort, fields });

    if (result.paginated) {
      return res.status(200).json({ paginated: true, items: result.items, meta: result.meta });
    }

    // stream cursor results when not paginated (matches product controller behavior)
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const cursor = result.items;
    res.write('{"paginated":false,"items":[');
    let isFirst = true;
    for await (const doc of cursor) {
      if (!isFirst) res.write(",");
      res.write(JSON.stringify(doc));
      isFirst = false;
    }
    res.write("]}");
    res.end();
  } catch (error) {
    const status = error.status || error.statusCode || 500;
    return res.status(status).json({ message: error.message });
  }
};

// Controller to handle creating a new FAQ entry

export const createFAQController = async (req, res) => {
  try {
    const { productId } = req.params;
    const { question, answer } = req.body;
    const newFAQ = await createFAQ(question, answer, productId);
    return res.status(201).json({ message: "FAQ created", faq: newFAQ });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};



// update an existing FAQ entry
export const updateFaqHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }
    const { faqId } = req.body;
    const data = req.body;
    const updated = await updateFAQ({ faqId, data });
    return res.status(200).json({ message: "FAQ updated", faq: updated });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

// delete an existing FAQ entry

export const deleteFaqHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }
    const { faqId } = req.body;
    const removed = await deleteFAQ({ faqId });
    return res.status(200).json({ message: "FAQ deleted", faq: removed });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};