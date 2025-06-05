let n = 100;

function factorial(n) {
    let ans="1";

    for (let i = 1; i <= n; i++) {
        let curMultiplier = i.toString();

        let res=[];let mxsize=0;
        for (let j = curMultiplier.length - 1; j >= 0; j--) {
            let element1 = Number(curMultiplier[j]);
            let cur="";
            for (let k = 0; k < curMultiplier.length-1-j; k++) {
                cur+="0";
            }
            let carry=0;
            for (let k = ans.length-1; k >=0; k--) {
                let element2=Number(ans[k]);
                let mult=element1*element2+carry;

                cur+=(mult%10).toString();
                if(mult>0)carry=Math.floor(mult/10);
                else carry=0;
                // console.log(mult);
                // console.log(carry);
            }
            if(carry!=0)cur+=(carry%10).toString();
            mxsize=Math.max(mxsize,cur.length);
            res.push(cur);
        }
        
        let temp="";
        carry=0;
        for (let j = 0; j < mxsize; j++) {
            
            let num=0;
            for (let k = 0; k < res.length; k++) {
                if(res[k].length>j){
                    num+=Number(res[k][j]);
                }
            }
            temp+=(num%10).toString();
            carry+=Math.floor(num/10);
        }
        while(carry>0)
        {temp+=(carry%10).toString();carry=Math.floor(carry/10);}

        ans=temp;
        ans=ans.split("").reverse().join("");
        console.log(ans);
    }
}
let nthFactorial = factorial(n);
